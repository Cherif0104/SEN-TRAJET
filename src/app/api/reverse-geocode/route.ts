import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "fr");
    const response = await fetch(url, {
      headers: { "User-Agent": "SentraJet/1.0 contact@sentrajet.sn" },
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error("Reverse geocoder unavailable");
    const row = (await response.json()) as { place_id?: number; display_name?: string; name?: string };
    return NextResponse.json({
      place: {
        id: `geo:${row.place_id || `${lat},${lng}`}`,
        label: row.name || "Ma position",
        address: row.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng
      }
    });
  } catch {
    return NextResponse.json({
      place: {
        id: `geo:${lat},${lng}`,
        label: "Ma position",
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng
      }
    });
  }
}
