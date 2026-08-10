import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ceilDistanceKm } from "@/lib/routeDistances";

type DistanceResult = {
  distanceKm: number;
  durationMinutes: number;
  source: string;
};

async function googleDrivingDistance(params: {
  fromPlace?: string;
  toPlace?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
}): Promise<DistanceResult | null> {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const origin =
    params.fromLat != null && params.fromLng != null
      ? `${params.fromLat},${params.fromLng}`
      : params.fromPlace;
  const destination =
    params.toLat != null && params.toLng != null ? `${params.toLat},${params.toLng}` : params.toPlace;
  if (!origin || !destination) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origin);
  url.searchParams.set("destinations", destination);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "fr");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    rows?: Array<{
      elements?: Array<{ status?: string; distance?: { value: number }; duration?: { value: number } }>;
    }>;
  };
  const element = payload.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK" || !element.distance?.value || !element.duration?.value) {
    return null;
  }
  return {
    distanceKm: ceilDistanceKm(element.distance.value / 1000),
    durationMinutes: Math.max(1, Math.round(element.duration.value / 60)),
    source: "google_distance_matrix",
  };
}

/** OSRM public — distance routière réelle entre deux coordonnées */
async function osrmDrivingDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DistanceResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=false`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "SentraJetPremium/1.0" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    code?: string;
    routes?: Array<{ distance?: number; duration?: number }>;
  };
  if (data.code !== "Ok" || !data.routes?.[0]?.distance) return null;
  const meters = data.routes[0].distance;
  const seconds = data.routes[0].duration ?? 0;
  return {
    distanceKm: ceilDistanceKm(meters / 1000),
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    source: "osrm",
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    fromPlace?: string;
    toPlace?: string;
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
  };

  const fromPlace = body.fromPlace?.trim() ?? "";
  const toPlace = body.toPlace?.trim() ?? "";
  const hasCoords =
    Number.isFinite(body.fromLat) &&
    Number.isFinite(body.fromLng) &&
    Number.isFinite(body.toLat) &&
    Number.isFinite(body.toLng);

  if (!hasCoords) {
    return NextResponse.json(
      {
        error:
          "Sélectionnez une adresse proposée pour le départ et l’arrivée (coordonnées GPS requises). Les km par défaut ne sont plus utilisés.",
        code: "PLACE_REQUIRED",
      },
      { status: 400 }
    );
  }

  // 1) Google Distance Matrix sur coords GPS
  const google = await googleDrivingDistance({
    fromPlace: fromPlace || undefined,
    toPlace: toPlace || undefined,
    fromLat: body.fromLat,
    fromLng: body.fromLng,
    toLat: body.toLat,
    toLng: body.toLng,
  });

  // 2) OSRM (OpenStreetMap) — même itinéraire routier réel
  const osrm =
    !google
      ? await osrmDrivingDistance(body.fromLat!, body.fromLng!, body.toLat!, body.toLng!)
      : null;

  const result = google ?? osrm;
  if (!result) {
    return NextResponse.json(
      {
        error:
          "Impossible de calculer une distance routière réelle. Choisissez des adresses précises dans les suggestions.",
        code: "NO_ROUTE",
      },
      { status: 404 }
    );
  }

  // Cache optionnel (ne bloque pas)
  if (fromPlace && toPlace) {
    try {
      await supabaseAdmin.from("region_distances").upsert(
        {
          from_place: fromPlace,
          to_place: toPlace,
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
          source: result.source,
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "from_place,to_place" }
      );
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    fromPlace,
    toPlace,
    fromLat: body.fromLat ?? null,
    fromLng: body.fromLng ?? null,
    toLat: body.toLat ?? null,
    toLng: body.toLng ?? null,
    distanceKm: result.distanceKm,
    durationMinutes: result.durationMinutes,
    source: result.source,
    rounded: "ceil_km",
    personalized: true,
  });
}
