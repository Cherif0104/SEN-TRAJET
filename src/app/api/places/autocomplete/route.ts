import { NextRequest, NextResponse } from "next/server";
import { googlePlacesAutocomplete } from "@/lib/googleMaps";

export const dynamic = "force-dynamic";

export type PlaceSuggestion = {
  id: string;
  label: string;
  secondary?: string;
  lat?: number;
  lng?: number;
  source: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

function buildOsmLabel(p: NonNullable<PhotonFeature["properties"]>): {
  label: string;
  secondary: string;
} {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const label = p.name || street || p.city || p.town || p.village || "Lieu";
  const city = p.city || p.town || p.village || "";
  const secondaryParts = [street && p.name ? street : "", city, p.state, p.country].filter(Boolean);
  return { label, secondary: secondaryParts.join(", ") };
}

async function photonAutocomplete(query: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("lat", "14.7167");
  url.searchParams.set("lon", "-17.4677");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "SentraJet/1.0 (booking)" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const out: PlaceSuggestion[] = [];
  for (const f of data.features || []) {
    const coords = f.geometry?.coordinates;
    const props = f.properties || {};
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    const { label, secondary } = buildOsmLabel(props);
    const osmKey = props.osm_id
      ? `${props.osm_type || "n"}${props.osm_id}`
      : `${lat.toFixed(5)},${lng.toFixed(5)}`;
    out.push({
      id: `photon:${osmKey}`,
      label,
      secondary: secondary || undefined,
      lat,
      lng,
      source: "photon",
    });
  }
  return out;
}

async function nominatimAutocomplete(query: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "sn");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "SentraJet/1.0 (https://sentrajet.com; booking autocomplete)",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id?: number;
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
  }>;
  const out: PlaceSuggestion[] = [];
  for (const item of data) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const description = item.display_name || item.name || "Lieu";
    const parts = description.split(",");
    out.push({
      id: `nominatim:${item.place_id ?? `${lat},${lng}`}`,
      label: (item.name || parts[0] || description).trim(),
      secondary: parts.slice(1).join(",").trim() || undefined,
      lat,
      lng,
      source: "nominatim",
    });
  }
  return out;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] as PlaceSuggestion[], provider: null });
  }

  try {
    const google = await googlePlacesAutocomplete(q);
    if (google.length > 0) {
      const suggestions: PlaceSuggestion[] = google.map((p) => ({
        id: `google:${p.placeId}`,
        label: p.mainText,
        secondary: p.secondaryText || p.description,
        source: "google",
      }));
      return NextResponse.json({ suggestions, provider: "google" });
    }
  } catch {
    /* fallback OSM */
  }

  try {
    const photon = await photonAutocomplete(q);
    if (photon.length > 0) {
      return NextResponse.json({ suggestions: photon, provider: "photon" });
    }
  } catch {
    /* fallback nominatim */
  }

  try {
    const nominatim = await nominatimAutocomplete(q);
    return NextResponse.json({ suggestions: nominatim, provider: "nominatim" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Autocomplete indisponible",
        suggestions: [],
      },
      { status: 502 }
    );
  }
}
