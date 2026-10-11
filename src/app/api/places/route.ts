import { NextRequest, NextResponse } from "next/server";
import type { Place } from "@/lib/types";

export const dynamic = "force-dynamic";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
};

function photonAddress(feature: PhotonFeature) {
  const properties = feature.properties ?? {};
  const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
  return [
    properties.name,
    street && street !== properties.name ? street : null,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.country
  ].filter(Boolean).join(", ");
}

async function searchPhoton(query: string, lat: number | null, lng: number | null) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "fr");
  url.searchParams.set("limit", "10");
  if (lat !== null && lng !== null) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
  }
  const response = await fetch(url, {
    headers: { "User-Agent": "SentraJet/1.0 contact@sentrajet.sn" },
    next: { revalidate: 900 }
  });
  if (!response.ok) throw new Error("Photon unavailable");
  const payload = await response.json() as { features?: PhotonFeature[] };
  return (payload.features ?? [])
    .filter((feature) => {
      const coordinates = feature.geometry?.coordinates;
      return coordinates
        && coordinates[1] >= 12.2
        && coordinates[1] <= 16.8
        && coordinates[0] >= -17.8
        && coordinates[0] <= -11.2;
    })
    .map((feature): Place | null => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates) return null;
      const address = photonAddress(feature);
      return {
        id: `photon:${feature.properties?.osm_id ?? `${coordinates[1]},${coordinates[0]}`}`,
        label: feature.properties?.name || feature.properties?.street || "Lieu",
        address: address || `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
        lat: coordinates[1],
        lng: coordinates[0],
        region: feature.properties?.state || feature.properties?.county || feature.properties?.city
      };
    })
    .filter((place): place is Place => Boolean(place));
}

async function searchNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Sénégal`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "sn");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "fr");
  url.searchParams.set("viewbox", "-17.8,16.8,-11.2,12.2");
  url.searchParams.set("bounded", "1");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SentraJet/1.0 contact@sentrajet.sn",
      Accept: "application/json"
    },
    next: { revalidate: 3600 }
  });
  if (!response.ok) throw new Error("Nominatim unavailable");
  const rows = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    name?: string;
    namedetails?: { name?: string };
    lat: string;
    lon: string;
    type?: string;
    address?: {
      state?: string;
      region?: string;
      county?: string;
      city?: string;
      town?: string;
    };
  }>;
  return rows.map((row): Place => ({
    id: `osm:${row.place_id}`,
    label: row.name || row.namedetails?.name || row.display_name.split(",")[0],
    address: row.display_name,
    lat: Number(row.lat),
    lng: Number(row.lon),
    region: row.address?.state
      || row.address?.region
      || row.address?.county
      || row.address?.city
      || row.address?.town
  }));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ suggestions: [] });
  const rawLat = Number(request.nextUrl.searchParams.get("lat"));
  const rawLng = Number(request.nextUrl.searchParams.get("lng"));
  const lat = Number.isFinite(rawLat) ? rawLat : null;
  const lng = Number.isFinite(rawLng) ? rawLng : null;

  try {
    const photon = await searchPhoton(query, lat, lng).catch(() => []);
    const fallback = photon.length >= 5 ? [] : await searchNominatim(query).catch(() => []);
    const unique = new Map<string, Place>();
    [...photon, ...fallback].forEach((place) => {
      const key = `${place.label.toLocaleLowerCase("fr")}:${place.lat.toFixed(4)}:${place.lng.toFixed(4)}`;
      if (!unique.has(key)) unique.set(key, place);
    });
    return NextResponse.json(
      { suggestions: [...unique.values()].slice(0, 10) },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "La recherche d’adresses est momentanément indisponible." }, { status: 503 });
  }
}
