import { supabase } from "@/lib/supabase";

export async function createBooking(params: {
  tripId: string;
  clientId: string;
  driverId: string;
  passengers: number;
  meetingPoint?: string;
  totalFcfa: number;
}) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      trip_id: params.tripId,
      client_id: params.clientId,
      driver_id: params.driverId,
      passengers: params.passengers,
      meeting_point: params.meetingPoint || null,
      total_fcfa: params.totalFcfa,
      status: "confirmed",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Annule une réservation (côté client ou chauffeur). Vérifier en amont que l’utilisateur est bien client ou chauffeur de cette réservation. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);
  if (error) throw error;
}

/** Met à jour le statut d'une réservation (ex. chauffeur marque comme terminé). */
export async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
}

export async function getBookingByTripAndClient(tripId: string, clientId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("trip_id", tripId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type BookingWithTrip = {
  id: string;
  trip_id: string;
  client_id: string;
  driver_id: string;
  passengers: number;
  total_fcfa: number;
  status: string;
  meeting_point: string | null;
  created_at: string;
  trip?: {
    id: string;
    from_city: string;
    to_city: string;
    departure_time: string;
    driver_name: string;
    price_fcfa: number;
  };
  other_party_name?: string;
};

/** Ligne brute renvoyée par Supabase (relation trip imbriquée). */
type BookingRow = Omit<BookingWithTrip, "other_party_name"> & {
  trip?: BookingWithTrip["trip"];
};

export async function getBookingsForClient(clientId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, trip_id, client_id, driver_id, passengers, total_fcfa, status, meeting_point, created_at,
      trip:trips(id, from_city, to_city, departure_time, driver_name, price_fcfa)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as unknown as BookingRow[];
  const driverIds = [...new Set(list.map((b) => b.driver_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) nameById[p.id] = p.full_name || "Chauffeur";
  return list.map((b) => ({
    ...b,
    other_party_name: nameById[b.driver_id],
  })) as BookingWithTrip[];
}

export async function getBookingsForDriver(driverId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, trip_id, client_id, driver_id, passengers, total_fcfa, status, meeting_point, created_at,
      trip:trips(id, from_city, to_city, departure_time, driver_name, price_fcfa)
    `)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as unknown as BookingRow[];
  const clientIds = [...new Set(list.map((b) => b.client_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", clientIds);
  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) nameById[p.id] = p.full_name || "Client";
  return list.map((b) => ({
    ...b,
    other_party_name: nameById[b.client_id],
  })) as BookingWithTrip[];
}
