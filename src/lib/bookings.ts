import { supabase } from "@/lib/supabase";
import { validateBookingDraft } from "@/lib/bookingRules";
import { canTransitionBookingStatus } from "@/lib/statusLabels";
import { isMissingSchemaObjectError } from "@/lib/postgrestErrors";

async function syncTripSeatAvailability(tripId: string): Promise<void> {
  if (!tripId) return;
  await supabase.rpc("sync_trip_available_seats", { p_trip_id: tripId });
}

export async function createBooking(params: {
  tripId: string;
  clientId: string;
  driverId: string;
  passengers: number;
  meetingPoint?: string;
  paymentMethod?: string;
  baggageType?: string;
  adultPassengers?: number;
  childPassengers?: number;
  totalFcfa: number;
}) {
  const validationError = validateBookingDraft({
    tripId: params.tripId,
    clientId: params.clientId,
    driverId: params.driverId,
    passengers: params.passengers,
    totalFcfa: params.totalFcfa,
  });
  if (validationError) throw new Error(validationError);

  const rowFull = {
    trip_id: params.tripId,
    client_id: params.clientId,
    driver_id: params.driverId,
    passengers: params.passengers,
    meeting_point: params.meetingPoint || null,
    payment_method: params.paymentMethod ?? null,
    baggage_type: params.baggageType ?? null,
    adult_passengers: params.adultPassengers ?? null,
    child_passengers: params.childPassengers ?? null,
    total_fcfa: params.totalFcfa,
    status: "pending",
  };

  const { payment_method: _pm, baggage_type: _bt, adult_passengers: _ap, child_passengers: _cp, ...rowLegacy } =
    rowFull;

  let { data, error } = await supabase.from("bookings").insert(rowFull).select().single();
  if (error && isMissingSchemaObjectError(error)) {
    const retry = await supabase.from("bookings").insert(rowLegacy).select().single();
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    throw new Error(`Impossible de créer la réservation: ${error.message}`);
  }
  await syncTripSeatAvailability(params.tripId);
  return data;
}

/** Annule une réservation (côté client ou chauffeur). Vérifier en amont que l’utilisateur est bien client ou chauffeur de cette réservation. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("bookings")
    .select("trip_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);
  if (error) throw error;
  await syncTripSeatAvailability(String(existing?.trip_id ?? ""));
}

/** Met à jour le statut d'une réservation (ex. chauffeur marque comme terminé). */
export async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("bookings")
    .select("trip_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Réservation introuvable.");
  if (!canTransitionBookingStatus(String(existing.status ?? ""), status)) {
    throw new Error(`Transition de statut non autorisée: ${String(existing.status ?? "unknown")} -> ${status}`);
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
  await syncTripSeatAvailability(String(existing.trip_id ?? ""));
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
  driver_profile?: { full_name: string | null } | null;
  client_profile?: { full_name: string | null } | null;
};

export async function getBookingsForClient(clientId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, trip_id, client_id, driver_id, passengers, total_fcfa, status, meeting_point, created_at,
      trip:trips(id, from_city, to_city, departure_time, driver_name, price_fcfa),
      driver_profile:profiles!driver_id(full_name)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as unknown as BookingRow[];
  return list.map((b) => ({
    ...b,
    other_party_name: b.driver_profile?.full_name || "Chauffeur",
  })) as BookingWithTrip[];
}

export async function getBookingsForDriver(driverId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, trip_id, client_id, driver_id, passengers, total_fcfa, status, meeting_point, created_at,
      trip:trips(id, from_city, to_city, departure_time, driver_name, price_fcfa),
      client_profile:profiles!client_id(full_name)
    `)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as unknown as BookingRow[];
  return list.map((b) => ({
    ...b,
    other_party_name: b.client_profile?.full_name || "Client",
  })) as BookingWithTrip[];
}
