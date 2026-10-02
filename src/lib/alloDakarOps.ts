import { supabase } from "@/lib/supabase";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

/** Nombre de minutes avant departure_at au-delà desquelles un départ ne peut plus être réservé
 * (configurable dans business_rules, catégorie allo_dakar). */
export async function getAlloDakarBookingCutoffMinutes(): Promise<number> {
  const rules = await listBusinessRules("allo_dakar");
  return ruleNumber(rules, "allo_dakar", "booking_cutoff_minutes", 30);
}

export type AlloDakarCorridor = {
  id: string;
  origin_city: string;
  destination_city: string;
  reference_price_fcfa: number | null;
  reference_price_domicile_fcfa: number | null;
  is_active: boolean;
};

export type AlloDakarDriver = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  id_card_number: string | null;
  garage_name: string | null;
  garage_id: string | null;
  wave_payout_mobile: string | null;
  wave_payout_name: string | null;
  status: "en_attente" | "actif" | "suspendu" | "rejete";
  notes: string | null;
  created_at: string;
};

export type AlloDakarGarage = {
  id: string;
  manager_user_id: string;
  name: string;
  phone: string;
  city: string | null;
  status: "en_attente" | "actif" | "suspendu";
  created_at: string;
};

export type AlloDakarVehicle = {
  id: string;
  allo_dakar_driver_id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  seats_total: number;
  grey_card_number: string | null;
  grey_card_url: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  is_verified: boolean;
};

export type AlloDakarSubscription = {
  id: string;
  allo_dakar_driver_id: string;
  corridor_id: string;
  plan: "essai_gratuit" | "hebdomadaire" | "mensuel";
  price_fcfa_paid: number;
  starts_at: string;
  ends_at: string;
  status: "actif" | "expire" | "suspendu";
};

export type AlloDakarPickupMode = "domicile" | "point_relais";

export type AlloDakarDeparture = {
  id: string;
  allo_dakar_driver_id: string;
  allo_dakar_vehicle_id: string;
  corridor_id: string;
  departure_at: string;
  price_per_seat_fcfa: number;
  price_domicile_fcfa: number | null;
  seats_total: number;
  seats_available: number;
  status: "publie" | "complet" | "en_cours" | "termine" | "annule";
  notes: string | null;
  corridor?: AlloDakarCorridor;
  driver?: AlloDakarDriver;
  vehicle?: AlloDakarVehicle;
};

export type AlloDakarBooking = {
  id: string;
  departure_id: string;
  client_user_id: string | null;
  client_full_name: string;
  client_phone: string;
  seats_booked: number;
  pickup_mode: AlloDakarPickupMode;
  pickup_detail: string | null;
  amount_fcfa: number;
  commission_fcfa: number;
  driver_payout_fcfa: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  status: "confirmee" | "annulee" | "terminee" | "no_show";
  created_at: string;
  departure?: AlloDakarDeparture;
};

export type AlloDakarRideRequest = {
  id: string;
  client_user_id: string | null;
  client_full_name: string;
  client_phone: string;
  corridor_id: string;
  desired_date: string;
  desired_time_hint: string | null;
  seats_needed: number;
  pickup_mode: AlloDakarPickupMode;
  pickup_detail: string | null;
  status: "ouverte" | "confirmee" | "expiree" | "annulee";
  confirmed_by_driver_id: string | null;
  matched_departure_id: string | null;
  matched_booking_id: string | null;
  created_at: string;
  corridor?: AlloDakarCorridor;
};

// ---------------------------------------------------------------------------
// Corridors
// ---------------------------------------------------------------------------
export async function listAlloDakarCorridors(): Promise<AlloDakarCorridor[]> {
  const { data, error } = await supabase
    .from("allo_dakar_corridors")
    .select("id, origin_city, destination_city, reference_price_fcfa, reference_price_domicile_fcfa, is_active")
    .order("origin_city");
  if (error) throw error;
  return (data ?? []) as AlloDakarCorridor[];
}

export async function createAlloDakarCorridor(input: {
  originCity: string;
  destinationCity: string;
  referencePriceFcfa?: number | null;
  referencePriceDomicileFcfa?: number | null;
}): Promise<void> {
  const { error } = await supabase.from("allo_dakar_corridors").insert({
    origin_city: input.originCity.trim(),
    destination_city: input.destinationCity.trim(),
    reference_price_fcfa: input.referencePriceFcfa ?? null,
    reference_price_domicile_fcfa: input.referencePriceDomicileFcfa ?? null,
  });
  if (error) throw error;
}

export async function setAlloDakarCorridorActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("allo_dakar_corridors").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Chauffeurs Allo Dakar
// ---------------------------------------------------------------------------
const DRIVER_SELECT =
  "id, user_id, full_name, phone, id_card_number, garage_name, garage_id, wave_payout_mobile, wave_payout_name, status, notes, created_at";

export async function listAlloDakarDrivers(): Promise<AlloDakarDriver[]> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
    .select(DRIVER_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlloDakarDriver[];
}

export async function getMyAlloDakarDriver(userId: string): Promise<AlloDakarDriver | null> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
    .select(DRIVER_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AlloDakarDriver) ?? null;
}

export async function listGarageDrivers(garageId: string): Promise<AlloDakarDriver[]> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
    .select(DRIVER_SELECT)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlloDakarDriver[];
}

export async function registerAlloDakarDriver(input: {
  userId: string;
  fullName: string;
  phone: string;
  idCardNumber?: string | null;
  garageName?: string | null;
}): Promise<AlloDakarDriver> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
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
  return data as AlloDakarDriver;
}

/** Création directe d'un chauffeur par le staff SentraJet (sans auto-inscription) — utile pour
 * les chauffeurs sans smartphone/compte propre. Statut actif d'emblée, contrairement à
 * l'auto-inscription (en_attente) — le staff qui saisit assume la vérification. */
export async function createAlloDakarDriverByStaff(input: {
  fullName: string;
  phone: string;
  idCardNumber?: string | null;
  garageId?: string | null;
}): Promise<AlloDakarDriver> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
    .insert({
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      id_card_number: input.idCardNumber ?? null,
      garage_id: input.garageId ?? null,
      status: "actif",
    })
    .select()
    .single();
  if (error) throw error;
  return data as AlloDakarDriver;
}

export async function setAlloDakarDriverStatus(id: string, status: AlloDakarDriver["status"]): Promise<void> {
  const { error } = await supabase.from("allo_dakar_drivers").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Garages (gestionnaires)
// ---------------------------------------------------------------------------
export async function getMyGarage(userId: string): Promise<AlloDakarGarage | null> {
  const { data, error } = await supabase
    .from("allo_dakar_garages")
    .select("id, manager_user_id, name, phone, city, status, created_at")
    .eq("manager_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AlloDakarGarage) ?? null;
}

export async function registerGarage(input: {
  managerUserId: string;
  name: string;
  phone: string;
  city?: string | null;
}): Promise<AlloDakarGarage> {
  const { data, error } = await supabase
    .from("allo_dakar_garages")
    .insert({
      manager_user_id: input.managerUserId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      city: input.city ?? null,
      status: "en_attente",
    })
    .select()
    .single();
  if (error) throw error;
  return data as AlloDakarGarage;
}

/** Création staff : compte de connexion + garage en un seul geste (activation immédiate). */
export async function createGarageWithManager(input: {
  email: string;
  password: string;
  fullName: string;
  garageName: string;
  phone: string;
  city?: string | null;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/allo-dakar/create-garage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Impossible de créer le garage.");
}

export async function listAllGarages(): Promise<AlloDakarGarage[]> {
  const { data, error } = await supabase
    .from("allo_dakar_garages")
    .select("id, manager_user_id, name, phone, city, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlloDakarGarage[];
}

export async function setGarageStatus(id: string, status: AlloDakarGarage["status"]): Promise<void> {
  const { error } = await supabase.from("allo_dakar_garages").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Ajoute un chauffeur au garage — utile pour les chauffeurs sans compte SentraJet propre : le
 * gestionnaire agit alors pour leur compte (user_id reste vide, rattachable plus tard). */
export async function addDriverToGarage(input: {
  garageId: string;
  fullName: string;
  phone: string;
  idCardNumber?: string | null;
}): Promise<AlloDakarDriver> {
  const { data, error } = await supabase
    .from("allo_dakar_drivers")
    .insert({
      garage_id: input.garageId,
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      id_card_number: input.idCardNumber ?? null,
      status: "en_attente",
    })
    .select()
    .single();
  if (error) throw error;
  return data as AlloDakarDriver;
}

// ---------------------------------------------------------------------------
// Véhicules Allo Dakar
// ---------------------------------------------------------------------------
const VEHICLE_SELECT =
  "id, allo_dakar_driver_id, plate_number, brand, model, seats_total, grey_card_number, grey_card_url, rejection_reason, verified_at, is_verified";

export async function listAlloDakarVehicles(driverId: string): Promise<AlloDakarVehicle[]> {
  const { data, error } = await supabase
    .from("allo_dakar_vehicles")
    .select(VEHICLE_SELECT)
    .eq("allo_dakar_driver_id", driverId);
  if (error) throw error;
  return (data ?? []) as AlloDakarVehicle[];
}

/** Tous les véhicules dont l'utilisateur courant peut voir la carte grise (chauffeur, garage
 * gestionnaire, ou staff — la RLS scope automatiquement le résultat). */
export async function listVerifiableAlloDakarVehicles(): Promise<AlloDakarVehicle[]> {
  const { data, error } = await supabase.from("allo_dakar_vehicles").select(VEHICLE_SELECT);
  if (error) throw error;
  return (data ?? []) as AlloDakarVehicle[];
}

export async function uploadVehicleGreyCard(vehicleId: string, driverId: string, file: File): Promise<void> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${driverId}/${vehicleId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("allo-dakar-documents").upload(path, file, {
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { error } = await supabase
    .from("allo_dakar_vehicles")
    .update({ grey_card_url: path, is_verified: false, rejection_reason: null, verified_at: null })
    .eq("id", vehicleId);
  if (error) throw error;
}

export async function getVehicleGreyCardSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("allo-dakar-documents").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function verifyAlloDakarVehicle(vehicleId: string, approved: boolean, reason?: string | null): Promise<void> {
  const { error } = await supabase.rpc("verify_allo_dakar_vehicle", {
    p_vehicle_id: vehicleId,
    p_approved: approved,
    p_reason: reason ?? null,
  });
  if (error) throw new Error("Impossible de mettre à jour la validation de ce véhicule.");
}

export async function addAlloDakarVehicle(input: {
  alloDakarDriverId: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  seatsTotal: number;
  greyCardNumber?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("allo_dakar_vehicles").insert({
    allo_dakar_driver_id: input.alloDakarDriverId,
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
export async function listAlloDakarSubscriptions(driverId?: string): Promise<AlloDakarSubscription[]> {
  let query = supabase
    .from("allo_dakar_driver_subscriptions")
    .select("id, allo_dakar_driver_id, corridor_id, plan, price_fcfa_paid, starts_at, ends_at, status")
    .order("starts_at", { ascending: false });
  if (driverId) query = query.eq("allo_dakar_driver_id", driverId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AlloDakarSubscription[];
}

export async function grantAlloDakarSubscription(input: {
  alloDakarDriverId: string;
  corridorId: string;
  plan: AlloDakarSubscription["plan"];
  priceFcfaPaid: number;
  durationDays: number;
}): Promise<void> {
  const endsAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("allo_dakar_driver_subscriptions").insert({
    allo_dakar_driver_id: input.alloDakarDriverId,
    corridor_id: input.corridorId,
    plan: input.plan,
    price_fcfa_paid: input.priceFcfaPaid,
    ends_at: endsAt,
    status: "actif",
  });
  if (error) throw error;
}

export async function setAlloDakarSubscriptionStatus(id: string, status: AlloDakarSubscription["status"]): Promise<void> {
  const { error } = await supabase.from("allo_dakar_driver_subscriptions").update({ status }).eq("id", id);
  if (error) throw error;
}

export function hasActiveSubscription(subscriptions: AlloDakarSubscription[], corridorId: string): boolean {
  return getActiveSubscription(subscriptions, corridorId) != null;
}

/** Renvoie l'abonnement actif (non expiré) le plus récent pour ce corridor, s'il existe. */
export function getActiveSubscription(
  subscriptions: AlloDakarSubscription[],
  corridorId: string
): AlloDakarSubscription | null {
  const now = Date.now();
  const active = subscriptions.filter(
    (s) => s.corridor_id === corridorId && s.status === "actif" && new Date(s.ends_at).getTime() > now
  );
  if (!active.length) return null;
  return active.sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0];
}

const PLAN_LABEL: Record<AlloDakarSubscription["plan"], string> = {
  essai_gratuit: "Essai gratuit",
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
};

export function formatSubscriptionPeriod(sub: AlloDakarSubscription): string {
  const end = new Date(sub.ends_at).toLocaleDateString("fr-FR");
  return `${PLAN_LABEL[sub.plan]} · jusqu’au ${end}`;
}

// ---------------------------------------------------------------------------
// Départs
// ---------------------------------------------------------------------------
const DEPARTURE_SELECT =
  "id, allo_dakar_driver_id, allo_dakar_vehicle_id, corridor_id, departure_at, price_per_seat_fcfa, price_domicile_fcfa, seats_total, seats_available, status, notes, corridor:allo_dakar_corridors(id, origin_city, destination_city, reference_price_fcfa, reference_price_domicile_fcfa, is_active), driver:allo_dakar_drivers(id, full_name, phone, garage_name), vehicle:allo_dakar_vehicles(id, plate_number, brand, model, seats_total)";

export async function searchAlloDakarDepartures(input: {
  originCity?: string;
  destinationCity?: string;
  fromDate?: string;
}): Promise<AlloDakarDeparture[]> {
  const cutoffMinutes = await getAlloDakarBookingCutoffMinutes();
  const cutoffAt = new Date(Date.now() + cutoffMinutes * 60_000).toISOString();
  let query = supabase
    .from("allo_dakar_departures")
    .select(DEPARTURE_SELECT)
    .eq("status", "publie")
    .gt("seats_available", 0)
    .gt("departure_at", cutoffAt)
    .order("departure_at", { ascending: true });
  if (input.fromDate) query = query.gte("departure_at", input.fromDate);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as AlloDakarDeparture[];
  if (input.originCity) {
    rows = rows.filter((d) => d.corridor?.origin_city?.toLowerCase().includes(input.originCity!.toLowerCase()));
  }
  if (input.destinationCity) {
    rows = rows.filter((d) => d.corridor?.destination_city?.toLowerCase().includes(input.destinationCity!.toLowerCase()));
  }
  return rows;
}

export async function listAlloDakarDeparturesForDriver(driverId: string): Promise<AlloDakarDeparture[]> {
  const { data, error } = await supabase
    .from("allo_dakar_departures")
    .select(DEPARTURE_SELECT)
    .eq("allo_dakar_driver_id", driverId)
    .order("departure_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AlloDakarDeparture[];
}

export async function listAllAlloDakarDepartures(): Promise<AlloDakarDeparture[]> {
  const { data, error } = await supabase
    .from("allo_dakar_departures")
    .select(DEPARTURE_SELECT)
    .order("departure_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as AlloDakarDeparture[];
}

export async function publishAlloDakarDeparture(input: {
  alloDakarDriverId: string;
  alloDakarVehicleId: string;
  corridorId: string;
  departureAt: string;
  pricePerSeatFcfa: number;
  priceDomicileFcfa?: number | null;
  seatsTotal: number;
}): Promise<void> {
  const { error } = await supabase.from("allo_dakar_departures").insert({
    allo_dakar_driver_id: input.alloDakarDriverId,
    allo_dakar_vehicle_id: input.alloDakarVehicleId,
    corridor_id: input.corridorId,
    departure_at: input.departureAt,
    price_per_seat_fcfa: input.pricePerSeatFcfa,
    price_domicile_fcfa: input.priceDomicileFcfa ?? null,
    seats_total: input.seatsTotal,
    seats_available: input.seatsTotal,
  });
  if (error) throw error;
}

export async function cancelAlloDakarDeparture(id: string): Promise<void> {
  const { error } = await supabase.from("allo_dakar_departures").update({ status: "annule" }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------
export async function bookAlloDakarSeats(input: {
  departureId: string;
  clientFullName: string;
  clientPhone: string;
  seats: number;
  pickupMode?: AlloDakarPickupMode;
  pickupDetail?: string | null;
}): Promise<AlloDakarBooking> {
  const { data, error } = await supabase.rpc("book_allo_dakar_seats", {
    p_departure_id: input.departureId,
    p_client_full_name: input.clientFullName,
    p_client_phone: input.clientPhone,
    p_seats: input.seats,
    p_pickup_mode: input.pickupMode ?? "point_relais",
    p_pickup_detail: input.pickupDetail ?? null,
  });
  if (error) {
    const messages: Record<string, string> = {
      not_enough_seats: "Il ne reste plus assez de places disponibles pour ce départ.",
      departure_not_bookable: "Ce départ n’est plus disponible à la réservation.",
      departure_not_found: "Départ introuvable.",
      booking_closed: "Les réservations pour ce départ sont clôturées (trop proche de l’heure de départ).",
      pickup_mode_unavailable: "Ce départ n’offre pas la prise en charge à domicile.",
    };
    const key = Object.keys(messages).find((k) => (error.message || "").includes(k));
    throw new Error(key ? messages[key] : "Impossible de réserver cette place.");
  }
  return data as AlloDakarBooking;
}

export async function cancelAlloDakarBooking(bookingId: string): Promise<AlloDakarBooking> {
  const { data, error } = await supabase.rpc("cancel_allo_dakar_booking", { p_booking_id: bookingId });
  if (error) throw new Error("Impossible d’annuler cette réservation.");
  return data as AlloDakarBooking;
}

const BOOKING_SELECT =
  "id, departure_id, client_user_id, client_full_name, client_phone, seats_booked, pickup_mode, pickup_detail, amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status, created_at";

export async function listAlloDakarBookingsForDeparture(departureId: string): Promise<AlloDakarBooking[]> {
  const { data, error } = await supabase
    .from("allo_dakar_bookings")
    .select(BOOKING_SELECT)
    .eq("departure_id", departureId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlloDakarBooking[];
}

export async function listAllAlloDakarBookings(): Promise<AlloDakarBooking[]> {
  const { data, error } = await supabase
    .from("allo_dakar_bookings")
    .select(`${BOOKING_SELECT}, departure:allo_dakar_departures(id, departure_at, corridor:allo_dakar_corridors(origin_city, destination_city))`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as AlloDakarBooking[];
}

// ---------------------------------------------------------------------------
// Demandes clients (marketplace inversé) : le client publie un besoin, un chauffeur le confirme
// ---------------------------------------------------------------------------
const RIDE_REQUEST_SELECT =
  "id, client_user_id, client_full_name, client_phone, corridor_id, desired_date, desired_time_hint, seats_needed, pickup_mode, pickup_detail, status, confirmed_by_driver_id, matched_departure_id, matched_booking_id, created_at, corridor:allo_dakar_corridors(id, origin_city, destination_city, reference_price_fcfa, reference_price_domicile_fcfa, is_active)";

export async function createAlloDakarRideRequest(input: {
  clientUserId?: string | null;
  clientFullName: string;
  clientPhone: string;
  corridorId: string;
  desiredDate: string;
  desiredTimeHint?: string | null;
  seatsNeeded: number;
  pickupMode: AlloDakarPickupMode;
  pickupDetail?: string | null;
}): Promise<AlloDakarRideRequest> {
  const { data, error } = await supabase
    .from("allo_dakar_ride_requests")
    .insert({
      client_user_id: input.clientUserId ?? null,
      client_full_name: input.clientFullName.trim(),
      client_phone: input.clientPhone.trim(),
      corridor_id: input.corridorId,
      desired_date: input.desiredDate,
      desired_time_hint: input.desiredTimeHint ?? null,
      seats_needed: input.seatsNeeded,
      pickup_mode: input.pickupMode,
      pickup_detail: input.pickupDetail ?? null,
    })
    .select(RIDE_REQUEST_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as AlloDakarRideRequest;
}

/** Demandes ouvertes, visibles par tout chauffeur pour trouver des clients sur ses corridors. */
export async function listOpenAlloDakarRideRequests(corridorId?: string): Promise<AlloDakarRideRequest[]> {
  let query = supabase
    .from("allo_dakar_ride_requests")
    .select(RIDE_REQUEST_SELECT)
    .eq("status", "ouverte")
    .order("desired_date", { ascending: true });
  if (corridorId) query = query.eq("corridor_id", corridorId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AlloDakarRideRequest[];
}

export async function listMyAlloDakarRideRequests(userId: string): Promise<AlloDakarRideRequest[]> {
  const { data, error } = await supabase
    .from("allo_dakar_ride_requests")
    .select(RIDE_REQUEST_SELECT)
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AlloDakarRideRequest[];
}

export async function cancelAlloDakarRideRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("allo_dakar_ride_requests")
    .update({ status: "annulee", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Le chauffeur confirme une demande cliente sur l'un de ses départs publiés : crée une vraie
 * réservation (même logique que book_allo_dakar_seats) et referme la demande. */
export async function confirmAlloDakarRideRequest(requestId: string, departureId: string): Promise<AlloDakarBooking> {
  const { data, error } = await supabase.rpc("confirm_allo_dakar_ride_request", {
    p_request_id: requestId,
    p_departure_id: departureId,
  });
  if (error) {
    const messages: Record<string, string> = {
      request_not_open: "Cette demande n’est plus disponible.",
      departure_not_bookable: "Ce départ n’est plus disponible à la réservation.",
      not_enough_seats: "Il ne reste plus assez de places sur ce départ.",
      corridor_mismatch: "Ce départ ne correspond pas au corridor de la demande.",
      pickup_mode_unavailable: "Ce départ n’offre pas le mode de prise en charge demandé.",
      not_authorized: "Vous ne pouvez confirmer que sur vos propres départs.",
    };
    const key = Object.keys(messages).find((k) => (error.message || "").includes(k));
    throw new Error(key ? messages[key] : "Impossible de confirmer cette demande.");
  }
  return data as AlloDakarBooking;
}

/** Tente de créer une session de paiement Wave réelle pour cette réservation Allo Dakar. */
export async function createAlloDakarWaveCheckout(bookingId: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/checkout/wave/allo-dakar", {
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
