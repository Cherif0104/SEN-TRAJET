import { NextRequest, NextResponse } from "next/server";

/**
 * Résout un place_id Google en coordonnées.
 * Pour Photon/Nominatim, les coords sont déjà dans l’autocomplete.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id.startsWith("google:")) {
    return NextResponse.json({ error: "id Google requis (google:place_id)" }, { status: 400 });
  }
  const placeId = id.slice("google:".length);
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Clé Google Maps absente" }, { status: 503 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "geometry,formatted_address,name");
  url.searchParams.set("language", "fr");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Place details failed" }, { status: 502 });
  }
  const data = (await res.json()) as {
    status?: string;
    result?: {
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
  };
  if (data.status !== "OK" || !data.result?.geometry?.location) {
    return NextResponse.json({ error: "Lieu introuvable", status: data.status }, { status: 404 });
  }

  return NextResponse.json({
    id,
    label: data.result.name || data.result.formatted_address,
    address: data.result.formatted_address,
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
    source: "google",
  });
}
