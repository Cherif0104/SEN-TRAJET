import { NextRequest, NextResponse } from "next/server";

/**
 * Trace d'itinéraire léger pour le suivi live (OSRM public, pas de clé requise) : renvoie la
 * géométrie de la route (pour affichage sur la carte) et une estimation de temps d'arrivée.
 * Distinct de /api/distance (utilisé pour le calcul tarifaire), afin de ne rien risquer sur ce
 * flux existant.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
  };

  const { fromLat, fromLng, toLat, toLng } = body;
  const hasCoords = [fromLat, fromLng, toLat, toLng].every((v) => typeof v === "number" && Number.isFinite(v));
  if (!hasCoords) {
    return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "SentraJetPremium/1.0" } });
    if (!res.ok) throw new Error("osrm_error");
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }>;
    };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) {
      return NextResponse.json({ error: "Itinéraire indisponible." }, { status: 404 });
    }
    const points = (route.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }));
    return NextResponse.json({
      points,
      distanceKm: route.distance ? Math.round((route.distance / 1000) * 10) / 10 : null,
      durationMinutes: route.duration ? Math.max(1, Math.round(route.duration / 60)) : null,
    });
  } catch {
    return NextResponse.json({ error: "Itinéraire indisponible." }, { status: 502 });
  }
}
