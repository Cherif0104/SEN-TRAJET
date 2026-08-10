import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeDistanceKm, getCityCoords } from "@/lib/geo";
import { ceilDistanceKm, lookupSeedDistanceKm, normalizePlaceKey } from "@/lib/routeDistances";

const GOOGLE_DISTANCE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";

type DistanceResult = {
  distanceKm: number;
  durationMinutes: number;
  source: string;
};

async function fetchDistanceFromGoogle(fromPlace: string, toPlace: string): Promise<DistanceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const url = new URL(GOOGLE_DISTANCE_URL);
  url.searchParams.set("origins", fromPlace);
  url.searchParams.set("destinations", toPlace);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "fr");
  url.searchParams.set("key", apiKey);
  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    rows?: Array<{ elements?: Array<{ status?: string; distance?: { value: number }; duration?: { value: number } }> }>;
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

function seedDistance(fromPlace: string, toPlace: string): DistanceResult | null {
  const km = lookupSeedDistanceKm(fromPlace, toPlace);
  if (km == null) return null;
  const distanceKm = ceilDistanceKm(km);
  return {
    distanceKm,
    durationMinutes: Math.max(1, Math.round((distanceKm / 70) * 60)),
    source: "seed_route",
  };
}

/** Secours ultime : orthodromie × facteur route ~1.35 */
function geoRoadFallback(fromPlace: string, toPlace: string): DistanceResult | null {
  const from = getCityCoords(fromPlace);
  const to = getCityCoords(toPlace);
  if (!from || !to) return null;
  const distanceKm = ceilDistanceKm(computeDistanceKm(from, to) * 1.35);
  return {
    distanceKm,
    durationMinutes: Math.max(1, Math.round((distanceKm / 70) * 60)),
    source: "geo_road_fallback",
  };
}

async function lookupCached(fromPlace: string, toPlace: string): Promise<DistanceResult | null> {
  try {
    const { data } = await supabaseAdmin
      .from("region_distances")
      .select("distance_km, duration_minutes, source")
      .ilike("from_place", fromPlace)
      .ilike("to_place", toPlace)
      .maybeSingle();
    if (!data) return null;
    return {
      distanceKm: ceilDistanceKm(Number(data.distance_km)),
      durationMinutes: Number(data.duration_minutes),
      source: String(data.source || "cache"),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    fromPlace?: string;
    toPlace?: string;
  };
  const fromPlace = body.fromPlace?.trim() ?? "";
  const toPlace = body.toPlace?.trim() ?? "";
  if (!fromPlace || !toPlace) {
    return NextResponse.json({ error: "fromPlace et toPlace requis" }, { status: 400 });
  }

  // 1) API itinéraire (prioritaire)
  const google = await fetchDistanceFromGoogle(fromPlace, toPlace);
  // 2) Cache DB
  const cached = google ? null : await lookupCached(fromPlace, toPlace);
  // 3) Seed table
  const seed = google || cached ? null : seedDistance(fromPlace, toPlace);
  // 4) Orthodromie corrigée
  const fallback = google ?? cached ?? seed ?? geoRoadFallback(fromPlace, toPlace);

  if (!fallback) {
    return NextResponse.json(
      {
        error: "Distance non disponible pour ces localités",
        hint: "Précisez une ville du Sénégal (ex. Thiès, Saint-Louis, AIBD).",
        fromKey: normalizePlaceKey(fromPlace),
        toKey: normalizePlaceKey(toPlace),
      },
      { status: 404 }
    );
  }

  if (google || (!cached && (seed || fallback.source === "geo_road_fallback"))) {
    try {
      await supabaseAdmin.from("region_distances").upsert(
        {
          from_place: fromPlace,
          to_place: toPlace,
          distance_km: fallback.distanceKm,
          duration_minutes: fallback.durationMinutes,
          source: fallback.source,
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "from_place,to_place" }
      );
    } catch {
      /* ignore cache write */
    }
  }

  return NextResponse.json({
    fromPlace,
    toPlace,
    distanceKm: fallback.distanceKm,
    durationMinutes: fallback.durationMinutes,
    source: fallback.source,
    rounded: "ceil_km",
  });
}
