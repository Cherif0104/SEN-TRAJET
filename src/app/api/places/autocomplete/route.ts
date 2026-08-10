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

/** Emprise large Sénégal (+ marge côtière) — filtre les faux positifs Photon (Roumanie, Écosse…). */
const SN_BBOX = {
  minLng: -17.85,
  minLat: 12.2,
  maxLng: -11.2,
  maxLat: 16.85,
};

const AIBD_PLACE: PlaceSuggestion = {
  id: "ref:aibd",
  label: "Aéroport Blaise Diagne (AIBD)",
  secondary: "Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669,
  source: "reference",
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
    countrycode?: string;
    postcode?: string;
  };
};

function inSenegalBbox(lat: number, lng: number): boolean {
  return (
    lat >= SN_BBOX.minLat &&
    lat <= SN_BBOX.maxLat &&
    lng >= SN_BBOX.minLng &&
    lng <= SN_BBOX.maxLng
  );
}

function isSenegalCountry(country?: string, countrycode?: string): boolean {
  const cc = (countrycode || "").toLowerCase();
  if (cc === "sn") return true;
  const c = (country || "").toLowerCase();
  return c.includes("sénégal") || c.includes("senegal");
}

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

function wantsAirport(query: string): boolean {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return (
    /\baibd\b/.test(q) ||
    q.includes("blaise diagne") ||
    q.includes("aeroport") ||
    q.includes("aéroport")
  );
}

function isOfficialAirport(s: PlaceSuggestion): boolean {
  if (s.id === AIBD_PLACE.id || s.source === "reference") return true;
  const t = `${s.label} ${s.secondary || ""}`.toLowerCase();
  return t.includes("blaise diagne") || (t.includes("aéroport") && t.includes("diagne"));
}

function prependAibdIfNeeded(query: string, suggestions: PlaceSuggestion[]): PlaceSuggestion[] {
  if (!wantsAirport(query)) return suggestions;
  const withoutDupRoad = suggestions.filter((s) => {
    // « AIBD » seul sur une voie ≠ aéroport — on garde l’entrée référence
    const t = `${s.label} ${s.secondary || ""}`.toLowerCase();
    if (t.trim() === "aibd" || /^aibd\b/.test(t) && !t.includes("aéroport") && !t.includes("diagne")) {
      return false;
    }
    return true;
  });
  if (withoutDupRoad.some(isOfficialAirport)) {
    return [...withoutDupRoad].sort((a, b) => Number(isOfficialAirport(b)) - Number(isOfficialAirport(a)));
  }
  return [AIBD_PLACE, ...withoutDupRoad].slice(0, 8);
}

async function photonAutocomplete(query: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("lat", "14.7167");
  url.searchParams.set("lon", "-17.4677");
  // bbox = minLon,minLat,maxLon,maxLat
  url.searchParams.set(
    "bbox",
    `${SN_BBOX.minLng},${SN_BBOX.minLat},${SN_BBOX.maxLng},${SN_BBOX.maxLat}`
  );

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
    if (!inSenegalBbox(lat, lng)) continue;
    // Si le pays est renseigné et n'est pas SN, ignorer
    if (props.country || props.countrycode) {
      if (!isSenegalCountry(props.country, props.countrycode)) continue;
    }
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
    if (out.length >= 8) break;
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
  url.searchParams.set("viewbox", `${SN_BBOX.minLng},${SN_BBOX.maxLat},${SN_BBOX.maxLng},${SN_BBOX.minLat}`);
  url.searchParams.set("bounded", "1");

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
    if (!inSenegalBbox(lat, lng)) continue;
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
      const suggestions = prependAibdIfNeeded(
        q,
        google.map((p) => ({
          id: `google:${p.placeId}`,
          label: p.mainText,
          secondary: p.secondaryText || p.description,
          source: "google",
        }))
      );
      return NextResponse.json({ suggestions, provider: "google" });
    }
  } catch {
    /* fallback OSM */
  }

  try {
    const photon = prependAibdIfNeeded(q, await photonAutocomplete(q));
    if (photon.length > 0) {
      return NextResponse.json({ suggestions: photon, provider: "photon" });
    }
  } catch {
    /* fallback nominatim */
  }

  try {
    const nominatim = prependAibdIfNeeded(q, await nominatimAutocomplete(q));
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
