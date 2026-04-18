import { supabase } from "@/lib/supabase";

export type DriverTripListItem = {
  id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  status: string;
  available_seats: number;
  total_seats: number;
  price_fcfa: number;
  created_at: string;
};

export async function getTripsForDriver(driverId: string): Promise<DriverTripListItem[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, from_city, to_city, departure_time, status, available_seats, total_seats, price_fcfa, created_at")
    .eq("driver_id", driverId)
    .order("departure_time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DriverTripListItem[];
}
