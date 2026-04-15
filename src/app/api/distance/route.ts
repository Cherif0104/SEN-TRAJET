import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeDistanceKm, getCityCoords } from "@/lib/geo";

const GOOGLE_DISTANCE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";

type DistanceRow = {
  id: string;
  from_place: string;
  to_place: string;
  distance_km: number;
  duration_minutes: number;
  source: string;
};

async function fetchDistanceFromGoogle(fromPlace: string, toPlace: string): Promise<{ distanceKm: number; durationMinutes: number } | null> {
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
    distanceKm: Number((element.distance.value / 1000).toFixed(2)),
    durationMinutes: Math.max(1, Math.round(element.duration.value / 60)),
  };
}

function estimateDistanceFallback(fromPlace: string, toPlace: string): { distanceKm: number; durationMinutes: number } | null {
  const from = getCityCoords(fromPlace);
  const to = getCityCoords(toPlace);
  if (!from || !to) return null;
  const distanceKm = Number(computeDistanceKm(from, to).toFixed(2));
  const durationMinutes = Math.max(1, Math.round((distanceKm / 60) * 60));
  return { distanceKm, durationMinutes };
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

  const { data: existing } = await supabaseAdmin
    .from("region_distances")
    .select("id, from_place, to_place, distance_km, duration_minutes, source")
    .eq("from_place", fromPlace)
    .eq("to_place", toPlace)
    .maybeSingle();

  if (existing) {
    const row = existing as DistanceRow;
    return NextResponse.json({
      fromPlace: row.from_place,
      toPlace: row.to_place,
      distanceKm: Number(row.distance_km),
      durationMinutes: Number(row.duration_minutes),
      source: row.source,
    });
  }

  const google = await fetchDistanceFromGoogle(fromPlace, toPlace);
  const fallback = google ?? estimateDistanceFallback(fromPlace, toPlace);
  if (!fallback) {
    return NextResponse.json({ error: "Distance non disponible pour ces localités" }, { status: 404 });
  }

  const source = google ? "google_distance_matrix" : "geo_fallback";
  await supabaseAdmin.from("region_distances").upsert(
    {
      from_place: fromPlace,
      to_place: toPlace,
      distance_km: fallback.distanceKm,
      duration_minutes: fallback.durationMinutes,
      source,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "from_place,to_place" }
  );

  return NextResponse.json({
    fromPlace,
    toPlace,
    distanceKm: fallback.distanceKm,
    durationMinutes: fallback.durationMinutes,
    source,
  });
}
