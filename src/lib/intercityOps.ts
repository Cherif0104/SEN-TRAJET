import { supabase } from "@/lib/supabase";

export type IntercityCorridor = {
  id: string;
  origin_city: string;
  destination_city: string;
  reference_price_fcfa: number | null;
  is_active: boolean;
};

export type IntercityDriver = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  id_card_number: string | null;
  garage_name: string | null;
  wave_payout_mobile: string | null;
  wave_payout_name: string | null;
  status: "en_attente" | "actif" | "suspendu" | "rejete";
  notes: string | null;
  created_at: string;
};

export type IntercityVehicle = {
  id: string;
  intercity_driver_id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  seats_total: number;
  grey_card_number: string | null;
  is_verified: boolean;
};

export type IntercitySubscription = {
  id: string;
  intercity_driver_id: string;
  corridor_id: string;
  plan: "essai_gratuit" | "hebdomadaire" | "mensuel";
  price_fcfa_paid: number;
  starts_at: string;
  ends_at: string;
  status: "actif" | "expire" | "suspendu";
};

export type IntercityDeparture = {
  id: string;
  intercity_driver_id: string;
  intercity_vehicle_id: string;
  corridor_id: string;
  departure_at: string;
  price_per_seat_fcfa: number;
  seats_total: number;
  seats_available: number;
  status: "publie" | "complet" | "en_cours" | "termine" | "annule";
  notes: string | null;
  corridor?: IntercityCorridor;
  driver?: IntercityDriver;
  vehicle?: IntercityVehicle;
};

export type IntercityBooking = {
  id: string;
  departure_id: string;
  client_user_id: string | null;
  client_full_name: string;
  client_phone: string;
  seats_booked: number;
  amount_fcfa: number;
  commission_fcfa: number;
  driver_payout_fcfa: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  status: "confirmee" | "annulee" | "terminee" | "no_show";
  created_at: string;
  departure?: IntercityDeparture;
};

// ---------------------------------------------------------------------------
// Corridors
// ---------------------------------------------------------------------------
export async function listIntercityCorridors(): Promise<IntercityCorridor[]> {
  const { data, error } = await supabase
    .from("intercity_corridors")
    .select("id, origin_city, destination_city, reference_price_fcfa, is_active")
    .order("origin_city");
  if (error) throw error;
  return (data ?? []) as IntercityCorridor[];
}

export async function createIntercityCorridor(input: {
  originCity: string;
  destinationCity: string;
  referencePriceFcfa?: number | null;
}): Promise<void> {
  const { error } = await supabase.from("intercity_corridors").insert({
    origin_city: input.originCity.trim(),
    destination_city: input.destinationCity.trim(),
    reference_price_fcfa: input.referencePriceFcfa ?? null,
  });
  if (error) throw error;
}

export async function setIntercityCorridorActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("intercity_corridors").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Chauffeurs intercité
// ---------------------------------------------------------------------------
export async function listIntercityDrivers(): Promise<IntercityDriver[]> {
  const { data, error } = await supabase
    .from("intercity_drivers")
    .select("id, user_id, full_name, phone, id_card_number, garage_name, wave_payout_mobile, wave_payout_name, status, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntercityDriver[];
}

export async function getMyIntercityDriver(userId: string): Promise<IntercityDriver | null> {
  const { data, error } = await supabase
    .from("intercity_drivers")
    .select("id, user_id, full_name, phone, id_card_number, garage_name, wave_payout_mobile, wave_payout_name, status, notes, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as IntercityDriver) ?? null;
}

export async function registerIntercityDriver(input: {
  userId: string;
  fullName: string;
  phone: string;
  idCardNumber?: string | null;
  garageName?: string | null;
}): Promise<IntercityDriver> {
  const { data, error } = await supabase
    .from("intercity_drivers")
    .insert({
      user_id: input.userId,
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      id_card_number: input.idCardNumber ?? null,
      garage_name: input.garageName ?? null,
      status: "en_attente",
    })
    .select()
    .single();
  if (error) throw error;
  return data as IntercityDriver;
}

export async function setIntercityDriverStatus(id: string, status: IntercityDriver["status"]): Promise<void> {
  const { error } = await supabase.from("intercity_drivers").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Véhicules intercité
// ---------------------------------------------------------------------------
export async function listIntercityVehicles(driverId: string): Promise<IntercityVehicle[]> {
  const { data, error } = await supabase
    .from("intercity_vehicles")
    .select("id, intercity_driver_id, plate_number, brand, model, seats_total, grey_card_number, is_verified")
    .eq("intercity_driver_id", driverId);
  if (error) throw error;
  return (data ?? []) as IntercityVehicle[];
}

export async function addIntercityVehicle(input: {
  intercityDriverId: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  seatsTotal: number;
  greyCardNumber?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("intercity_vehicles").insert({
    intercity_driver_id: input.intercityDriverId,
    plate_number: input.plateNumber.trim(),
    brand: input.brand ?? null,
    model: input.model ?? null,
    seats_total: input.seatsTotal,
    grey_card_number: input.greyCardNumber ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Abonnements (droit de publication par corridor)
// ---------------------------------------------------------------------------
export async function listIntercitySubscriptions(driverId?: string): Promise<IntercitySubscription[]> {
  let query = supabase
    .from("intercity_driver_subscriptions")
    .select("id, intercity_driver_id, corridor_id, plan, price_fcfa_paid, starts_at, ends_at, status")
    .order("starts_at", { ascending: false });
  if (driverId) query = query.eq("intercity_driver_id", driverId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IntercitySubscription[];
}

export async function grantIntercitySubscription(input: {
  intercityDriverId: string;
  corridorId: string;
  plan: IntercitySubscription["plan"];
  priceFcfaPaid: number;
  durationDays: number;
}): Promise<void> {
  const endsAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("intercity_driver_subscriptions").insert({
    intercity_driver_id: input.intercityDriverId,
    corridor_id: input.corridorId,
    plan: input.plan,
    price_fcfa_paid: input.priceFcfaPaid,
    ends_at: endsAt,
    status: "actif",
  });
  if (error) throw error;
}

export async function setIntercitySubscriptionStatus(id: string, status: IntercitySubscription["status"]): Promise<void> {
  const { error } = await supabase.from("intercity_driver_subscriptions").update({ status }).eq("id", id);
  if (error) throw error;
}

export function hasActiveSubscription(subscriptions: IntercitySubscription[], corridorId: string): boolean {
  const now = Date.now();
  return subscriptions.some(
    (s) => s.corridor_id === corridorId && s.status === "actif" && new Date(s.ends_at).getTime() > now
  );
}

// ---------------------------------------------------------------------------
// Départs
// ---------------------------------------------------------------------------
const DEPARTURE_SELECT =
  "id, intercity_driver_id, intercity_vehicle_id, corridor_id, departure_at, price_per_seat_fcfa, seats_total, seats_available, status, notes, corridor:intercity_corridors(id, origin_city, destination_city, reference_price_fcfa, is_active), driver:intercity_drivers(id, full_name, phone, garage_name), vehicle:intercity_vehicles(id, plate_number, brand, model, seats_total)";

export async function searchIntercityDepartures(input: {
  originCity?: string;
  destinationCity?: string;
  fromDate?: string;
}): Promise<IntercityDeparture[]> {
  let query = supabase
    .from("intercity_departures")
    .select(DEPARTURE_SELECT)
    .eq("status", "publie")
    .gt("seats_available", 0)
    .order("departure_at", { ascending: true });
  if (input.fromDate) query = query.gte("departure_at", input.fromDate);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as IntercityDeparture[];
  if (input.originCity) {
    rows = rows.filter((d) => d.corridor?.origin_city?.toLowerCase().includes(input.originCity!.toLowerCase()));
  }
  if (input.destinationCity) {
    rows = rows.filter((d) => d.corridor?.destination_city?.toLowerCase().includes(input.destinationCity!.toLowerCase()));
  }
  return rows;
}

export async function listIntercityDeparturesForDriver(driverId: string): Promise<IntercityDeparture[]> {
  const { data, error } = await supabase
    .from("intercity_departures")
    .select(DEPARTURE_SELECT)
    .eq("intercity_driver_id", driverId)
    .order("departure_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as IntercityDeparture[];
}

export async function listAllIntercityDepartures(): Promise<IntercityDeparture[]> {
  const { data, error } = await supabase
    .from("intercity_departures")
    .select(DEPARTURE_SELECT)
    .order("departure_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as IntercityDeparture[];
}

export async function publishIntercityDeparture(input: {
  intercityDriverId: string;
  intercityVehicleId: string;
  corridorId: string;
  departureAt: string;
  pricePerSeatFcfa: number;
  seatsTotal: number;
}): Promise<void> {
  const { error } = await supabase.from("intercity_departures").insert({
    intercity_driver_id: input.intercityDriverId,
    intercity_vehicle_id: input.intercityVehicleId,
    corridor_id: input.corridorId,
    departure_at: input.departureAt,
    price_per_seat_fcfa: input.pricePerSeatFcfa,
    seats_total: input.seatsTotal,
    seats_available: input.seatsTotal,
  });
  if (error) throw error;
}

export async function cancelIntercityDeparture(id: string): Promise<void> {
  const { error } = await supabase.from("intercity_departures").update({ status: "annule" }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------
export async function bookIntercitySeats(input: {
  departureId: string;
  clientFullName: string;
  clientPhone: string;
  seats: number;
}): Promise<IntercityBooking> {
  const { data, error } = await supabase.rpc("book_intercity_seats", {
    p_departure_id: input.departureId,
    p_client_full_name: input.clientFullName,
    p_client_phone: input.clientPhone,
    p_seats: input.seats,
  });
  if (error) {
    const messages: Record<string, string> = {
      not_enough_seats: "Il ne reste plus assez de places disponibles pour ce départ.",
      departure_not_bookable: "Ce départ n’est plus disponible à la réservation.",
      departure_not_found: "Départ introuvable.",
    };
    const key = Object.keys(messages).find((k) => (error.message || "").includes(k));
    throw new Error(key ? messages[key] : "Impossible de réserver cette place.");
  }
  return data as IntercityBooking;
}

export async function cancelIntercityBooking(bookingId: string): Promise<IntercityBooking> {
  const { data, error } = await supabase.rpc("cancel_intercity_booking", { p_booking_id: bookingId });
  if (error) throw new Error("Impossible d’annuler cette réservation.");
  return data as IntercityBooking;
}

export async function listIntercityBookingsForDeparture(departureId: string): Promise<IntercityBooking[]> {
  const { data, error } = await supabase
    .from("intercity_bookings")
    .select("id, departure_id, client_user_id, client_full_name, client_phone, seats_booked, amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status, created_at")
    .eq("departure_id", departureId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntercityBooking[];
}

export async function listAllIntercityBookings(): Promise<IntercityBooking[]> {
  const { data, error } = await supabase
    .from("intercity_bookings")
    .select("id, departure_id, client_user_id, client_full_name, client_phone, seats_booked, amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status, created_at, departure:intercity_departures(id, departure_at, corridor:intercity_corridors(origin_city, destination_city))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as IntercityBooking[];
}

/** Tente de créer une session de paiement Wave réelle pour cette réservation Intercité. */
export async function createIntercityWaveCheckout(bookingId: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/checkout/wave/intercity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ bookingId }),
    });
    const data = (await res.json().catch(() => ({}))) as { checkout_url?: string | null };
    if (!res.ok || !data.checkout_url) return null;
    return data.checkout_url;
  } catch {
    return null;
  }
}
