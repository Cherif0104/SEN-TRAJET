"use client";

import { supabase } from "@/lib/supabase";

export type BookingLocationRole = "client" | "driver";

export interface BookingLocationRow {
  id: string;
  booking_id: string;
  role: BookingLocationRole;
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

export async function pushBookingLocation(
  bookingId: string,
  role: BookingLocationRole,
  pos: GeoPosition
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("booking_locations").insert({
    booking_id: bookingId,
    role,
    lat: pos.lat,
    lng: pos.lng,
    accuracy_m: pos.accuracy ?? null,
    heading_deg: pos.heading ?? null,
    speed_kmh: pos.speed ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function fetchLatestBookingLocations(
  bookingId: string
): Promise<{ client: BookingLocationRow | null; driver: BookingLocationRow | null }> {
  const { data, error } = await supabase
    .from("booking_locations")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    return { client: null, driver: null };
  }

  let client: BookingLocationRow | null = null;
  let driver: BookingLocationRow | null = null;
  for (const row of data as BookingLocationRow[]) {
    if (row.role === "client" && !client) client = row;
    if (row.role === "driver" && !driver) driver = row;
    if (client && driver) break;
  }
  return { client, driver };
}
