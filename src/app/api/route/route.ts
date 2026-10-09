import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  pickup: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() })
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Itinéraire invalide." }, { status: 400 });

  const { pickup, destination } = parsed.data;
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Router unavailable");
    const payload = (await response.json()) as {
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: number[][] } }>;
    };
    const route = payload.routes?.[0];
    if (!route) return NextResponse.json({ error: "Aucun itinéraire trouvé." }, { status: 404 });
    return NextResponse.json({
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      geometry: route.geometry.coordinates
    });
  } catch {
    return NextResponse.json({ error: "Le calcul d’itinéraire est indisponible." }, { status: 503 });
  }
}
