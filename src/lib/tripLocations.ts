"use client";

import { supabase } from "@/lib/supabase";

export type TripLocationRole = "client" | "driver";

export interface TripLocationRow {
  id: string;
  trip_id: string;
  role: TripLocationRole;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading_deg: number | null;
  speed_kmh: number | null;
  created_at: string;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export async function pushTripLocation(
  tripId: string,
  role: TripLocationRole,
  pos: GeoPosition
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("trip_locations").insert({
    trip_id: tripId,
    role,
    lat: pos.lat,
    lng: pos.lng,
    accuracy_m: pos.accuracy ?? null,
    heading_deg: pos.heading ?? null,
    speed_kmh: pos.speed ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function fetchLatestTripLocations(
  tripId: string
): Promise<{ client: TripLocationRow | null; driver: TripLocationRow | null }> {
  const { data, error } = await supabase
    .from("trip_locations")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { client: null, driver: null };
  }

  let client: TripLocationRow | null = null;
  let driver: TripLocationRow | null = null;
  for (const row of data) {
    if (row.role === "client" && !client) client = row as TripLocationRow;
    if (row.role === "driver" && !driver) driver = row as TripLocationRow;
    if (client && driver) break;
  }
  return { client, driver };
}
