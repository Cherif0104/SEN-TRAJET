import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ suggestions: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Sénégal`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "sn");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "7");
  url.searchParams.set("accept-language", "fr");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SentraJet/1.0 contact@sentrajet.sn",
        Accept: "application/json"
      },
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error("Geocoder unavailable");
    const rows = (await response.json()) as Array<{
      place_id: number;
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      type?: string;
    }>;
    return NextResponse.json({
      suggestions: rows.map((row) => ({
        id: `osm:${row.place_id}`,
        label: row.name || row.display_name.split(",")[0],
        address: row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
        type: row.type || "place"
      }))
    });
  } catch {
    return NextResponse.json({ error: "La recherche d’adresses est momentanément indisponible." }, { status: 503 });
  }
}
