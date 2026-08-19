import { supabase } from "@/lib/supabase";
import type { PricingSegment, ServiceType } from "@/lib/sentrajetPricing";
import { bookingStatusLabel, normalizeBookingStatus } from "@/lib/engines/bookingStatuses";

export type PlatformBookingStatus = string;

export type PlatformDriver = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  email: string | null;
  photo_url: string | null;
  license_number: string | null;
  license_photo_url: string | null;
  license_expiry_date: string | null;
  address: string | null;
  emergency_contact: string | null;
  notes: string | null;
};

export type PlatformVehicle = {
  id: string;
  brand: string;
  model: string;
  plate_number: string;
  seats: number | null;
  status: string;
  category: string;
  driver_id: string | null;
  year: number | null;
  color: string | null;
  photo_url: string | null;
  photo_urls: string[];
  is_verified: boolean;
  notes: string | null;
  service_class?: string | null;
  air_conditioning?: boolean;
  transport_vehicle_category?: string | null;
};

export type PlatformClient = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  client_type: string;
  user_id: string | null;
  avatar_url: string | null;
  notes: string | null;
  matricule?: string | null;
  whatsapp?: string | null;
  address?: string | null;
};

export type PartnerContract = {
  id: string;
  partner_name: string;
  contract_number: string;
  status: string;
  partner_user_id: string | null;
  start_date: string;
  end_date: string | null;
};

export type PlatformDispatch = {
  id: string;
  driver_id: string;
  vehicle_id: string;
  driver: PlatformDriver | null;
  vehicle: PlatformVehicle | null;
};

export type PlatformBooking = {
  id: string;
  reference: string | null;
  client_id: string | null;
  lead_id: string | null;
  status: PlatformBookingStatus;
  pickup: string;
  dropoff: string;
  pickup_time: string;
  service_type: string;
  estimated_price: number | null;
  passengers: number;
  notes: string | null;
  pricing_segment: PricingSegment | string;
  partner_contract_id: string | null;
  distance_km: number | null;
  created_at: string;
  client: Pick<PlatformClient, "id" | "full_name" | "company_name" | "phone"> | null;
  service_order: {
    id: string;
    order_number: string;
    status: string;
    dispatch: PlatformDispatch | null;
  } | null;
};

export const BOOKING_STATUS_LABEL: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get: (_t, prop: string) => bookingStatusLabel(prop),
  }
);

/** Statuts terminaux "réussis" (course effectuée) — utilisés pour l'onglet Passées côté client. */
export const CLIENT_TERMINAL_STATUSES = ["terminee"];
/** Statuts terminaux "annulés" (quelle que soit la cause) — utilisés pour l'onglet Annulées. */
export const CLIENT_CANCELLED_STATUSES = [
  "annulee_client",
  "annulee_sentrajet",
  "remboursee",
  "remboursement_en_cours",
  "no_show",
];

export function bookingStatusTone(status: string): "success" | "warning" | "info" | "danger" {
  const s = normalizeBookingStatus(status);
  if (["confirmee", "terminee", "payee", "remboursee", "available", "active", "Disponible"].includes(s)) {
    return "success";
  }
  if (
    [
      "en_cours",
      "en_attente_de_confirmation",
      "en_attente_de_paiement",
      "chauffeur_en_route",
      "chauffeur_arrive",
      "client_pris_en_charge",
      "demande",
      "on_trip",
    ].includes(s)
  ) {
    return "warning";
  }
  if (["chauffeur_a_assigner", "chauffeur_assigne", "brouillon"].includes(s)) return "info";
  return "danger";
}

function makeReference(): string {
  return `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
}

function makeOrderNumber(): string {
  return `SO-${Date.now().toString().slice(-8)}`;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listPlatformBookings(): Promise<PlatformBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, client_id, lead_id, status, pickup, dropoff, pickup_time, service_type,
       estimated_price, passengers, notes, pricing_segment, partner_contract_id, distance_km, created_at,
       client:clients(id, full_name, company_name, phone),
       service_orders(id, order_number, status,
         dispatch_assignments(id, driver_id, vehicle_id,
           driver:drivers(id, full_name, phone, status, user_id),
           vehicle:vehicles(id, brand, model, plate_number, seats, status, category)
         )
       )`
    )
    .order("pickup_time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const order = firstRelation(r.service_orders as Record<string, unknown> | Record<string, unknown>[] | null);
    const dispatchRaw = order
      ? firstRelation(
          order.dispatch_assignments as Record<string, unknown> | Record<string, unknown>[] | null
        )
      : null;

    return {
      id: String(r.id),
      reference: (r.reference as string | null) ?? null,
      client_id: (r.client_id as string | null) ?? null,
      lead_id: (r.lead_id as string | null) ?? null,
      status: String(r.status),
      pickup: String(r.pickup),
      dropoff: String(r.dropoff),
      pickup_time: String(r.pickup_time),
      service_type: String(r.service_type),
      estimated_price: r.estimated_price == null ? null : Number(r.estimated_price),
      passengers: Number(r.passengers ?? 1),
      notes: (r.notes as string | null) ?? null,
      pricing_segment: String(r.pricing_segment ?? "client"),
      partner_contract_id: (r.partner_contract_id as string | null) ?? null,
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      created_at: String(r.created_at),
      client: (firstRelation(r.client as PlatformClient | PlatformClient[] | null) as PlatformBooking["client"]) ?? null,
      service_order: order
        ? {
            id: String(order.id),
            order_number: String(order.order_number),
            status: String(order.status),
            dispatch: dispatchRaw
              ? {
                  id: String(dispatchRaw.id),
                  driver_id: String(dispatchRaw.driver_id),
                  vehicle_id: String(dispatchRaw.vehicle_id),
                  driver: (firstRelation(dispatchRaw.driver as PlatformDriver | PlatformDriver[] | null) as PlatformDriver | null),
                  vehicle: (firstRelation(dispatchRaw.vehicle as PlatformVehicle | PlatformVehicle[] | null) as PlatformVehicle | null),
                }
              : null,
          }
        : null,
    };
  });
}

export async function listDrivers(): Promise<PlatformDriver[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, full_name, phone, status, user_id, email, photo_url, license_number, license_photo_url, license_expiry_date, address, emergency_contact, notes")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as PlatformDriver[];
}

export async function listVehicles(): Promise<PlatformVehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate_number, seats, status, category, driver_id, year, color, photo_url, photo_urls, is_verified, notes, service_class, air_conditioning, transport_vehicle_category")
    .order("brand");
  if (error) throw error;
  return (data ?? []) as PlatformVehicle[];
}

export async function listClients(): Promise<PlatformClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, company_name, phone, email, client_type, user_id, avatar_url, notes, matricule, whatsapp, address")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlatformClient[];
}

export type ManagedDriverInput = Omit<PlatformDriver, "id" | "user_id"> & {
  user_id?: string | null;
};

export async function createDriver(input: ManagedDriverInput): Promise<PlatformDriver> {
  const { data, error } = await supabase.from("drivers").insert(input).select("*").single();
  if (error) throw error;
  return data as PlatformDriver;
}

export async function updateDriver(
  id: string,
  input: Partial<ManagedDriverInput>,
): Promise<PlatformDriver> {
  const { data, error } = await supabase.from("drivers").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PlatformDriver;
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

export type ManagedVehicleInput = Omit<PlatformVehicle, "id">;

export async function createVehicle(input: ManagedVehicleInput): Promise<PlatformVehicle> {
  const { data, error } = await supabase.from("vehicles").insert(input).select("*").single();
  if (error) throw error;
  return data as PlatformVehicle;
}

export async function updateManagedVehicle(
  id: string,
  input: Partial<ManagedVehicleInput>,
): Promise<PlatformVehicle> {
  const { data, error } = await supabase.from("vehicles").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PlatformVehicle;
}

export async function deleteManagedVehicle(id: string): Promise<void> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export type ManagedClientInput = Omit<PlatformClient, "id" | "user_id"> & {
  user_id?: string | null;
};

export async function createClient(input: ManagedClientInput): Promise<PlatformClient> {
  const { data, error } = await supabase.from("clients").insert(input).select("*").single();
  if (error) throw error;
  return data as PlatformClient;
}

export async function updateClient(
  id: string,
  input: Partial<ManagedClientInput>,
): Promise<PlatformClient> {
  const { data, error } = await supabase.from("clients").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PlatformClient;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function listPartnerContracts(): Promise<PartnerContract[]> {
  const { data, error } = await supabase
    .from("partner_contracts")
    .select("id, partner_name, contract_number, status, partner_user_id, start_date, end_date")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerContract[];
}

export async function ensureClientForUser(params: {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  clientType?: "particulier" | "entreprise";
}): Promise<string> {
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: params.userId,
      full_name: params.fullName ?? null,
      phone: params.phone ?? null,
      email: params.email ?? null,
      company_name: params.companyName ?? null,
      client_type: params.clientType ?? "particulier",
    })
    .select("id")
    .single();
  if (error) throw formatSupabaseError(error, "Impossible de créer le profil client.");
  return data.id as string;
}

function formatSupabaseError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    const clean = error.message.split("\n")[0]?.split(" at http")[0]?.trim() || error.message;
    if (/failed to fetch|fetch failed/i.test(clean)) {
      return new Error(
        "Connexion impossible au serveur de réservation. Réessayez dans un instant."
      );
    }
    return new Error(clean || fallback);
  }
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length) return new Error(parts.join(" — "));
  }
  return new Error(fallback);
}

async function createBookingViaApi(input: {
  clientId?: string | null;
  partnerContractId?: string | null;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  serviceType: ServiceType | string;
  passengers: number;
  estimatedPrice: number | null;
  pricingSegment: PricingSegment;
  distanceKm?: number | null;
  notes?: string | null;
  vehiclesNeeded?: number;
  isRoundTrip?: boolean;
  phone?: string | null;
  flightNumber?: string | null;
  passengerName?: string | null;
  luggageCount?: number | null;
}): Promise<PlatformBooking | null> {
  if (typeof window === "undefined") return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch("/api/bookings/demande", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      clientId: input.clientId ?? null,
      partnerContractId: input.partnerContractId ?? null,
      pickup: input.pickup,
      dropoff: input.dropoff,
      pickupTime: input.pickupTime,
      serviceType: input.serviceType,
      passengers: input.passengers,
      estimatedPrice: input.estimatedPrice,
      pricingSegment: input.pricingSegment,
      distanceKm: input.distanceKm ?? null,
      notes: input.notes ?? null,
      vehiclesNeeded: input.vehiclesNeeded ?? 1,
      isRoundTrip: input.isRoundTrip ?? false,
      phone: input.phone ?? null,
      flightNumber: input.flightNumber ?? null,
      passengerName: input.passengerName ?? null,
      luggageCount: input.luggageCount ?? null,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    booking?: PlatformBooking;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || "Impossible d’envoyer la demande.");
  }
  return payload.booking ?? null;
}

export async function createPlatformBooking(input: {
  clientId?: string | null;
  partnerContractId?: string | null;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  serviceType: ServiceType | string;
  passengers: number;
  estimatedPrice: number | null;
  pricingSegment: PricingSegment;
  distanceKm?: number | null;
  notes?: string | null;
  vehiclesNeeded?: number;
  isRoundTrip?: boolean;
  phone?: string | null;
  flightNumber?: string | null;
  passengerName?: string | null;
  luggageCount?: number | null;
}): Promise<PlatformBooking> {
  // Prefer same-origin API (évite Failed to fetch / CORS / env client incomplète).
  try {
    const viaApi = await createBookingViaApi(input);
    if (viaApi) return viaApi;
  } catch (apiErr) {
    // Si l’API répond avec un message métier, on le remonte ; sinon fallback RPC.
    if (apiErr instanceof Error && !/failed to fetch/i.test(apiErr.message)) {
      throw formatSupabaseError(apiErr, "Impossible d’envoyer la demande.");
    }
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("submit_booking_demande", {
    p_pickup: input.pickup,
    p_dropoff: input.dropoff,
    p_pickup_time: input.pickupTime,
    p_service_type: input.serviceType,
    p_passengers: input.passengers,
    p_estimated_price: input.estimatedPrice,
    p_pricing_segment: input.pricingSegment,
    p_distance_km: input.distanceKm ?? null,
    p_notes: input.notes ?? null,
    p_phone: input.phone ?? null,
    p_flight_number: input.flightNumber ?? null,
    p_passenger_name: input.passengerName ?? null,
    p_luggage_count: input.luggageCount ?? null,
    p_vehicles_needed: input.vehiclesNeeded ?? 1,
    p_is_round_trip: input.isRoundTrip ?? false,
    p_client_id: input.clientId ?? null,
    p_partner_contract_id: input.partnerContractId ?? null,
  });

  if (!rpcError && rpcData) {
    return rpcData as PlatformBooking;
  }

  const reference = makeReference();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      reference,
      client_id: input.clientId ?? null,
      partner_contract_id: input.partnerContractId ?? null,
      pickup: input.pickup,
      dropoff: input.dropoff,
      pickup_time: input.pickupTime,
      service_type: input.serviceType,
      passengers: input.passengers,
      estimated_price: input.estimatedPrice,
      pricing_segment: input.pricingSegment,
      distance_km: input.distanceKm ?? null,
      notes: input.notes ?? null,
      status: "demande_recue",
      vehicles_needed: input.vehiclesNeeded ?? 1,
      is_round_trip: input.isRoundTrip ?? false,
      phone: input.phone ?? null,
      flight_number: input.flightNumber ?? null,
      passenger_name: input.passengerName ?? null,
      luggage_count: input.luggageCount ?? null,
    })
    .select("*")
    .single();
  if (error) {
    throw formatSupabaseError(
      rpcError ?? error,
      "Impossible d’envoyer la demande (réservation refusée par la base)."
    );
  }

  const booking = data as PlatformBooking;

  await supabase.from("service_orders").insert({
    booking_id: booking.id,
    order_number: makeOrderNumber(),
    status: "planned",
  });

  await supabase.from("booking_status_history").insert({
    booking_id: booking.id,
    from_status: null,
    to_status: "demande_recue",
    note: "Demande reçue — en attente de traitement SentraJet",
  });

  return booking;
}

export async function listIncompleteBookings(): Promise<PlatformBooking[]> {
  const all = await listPlatformBookings();
  return all
    .filter((b) =>
      [
        "demande_recue",
        "demande",
        "info_demandee",
        "devis_envoye",
        "devis_accepte",
        "en_attente_de_paiement",
        "nouvelle",
        "brouillon",
      ].includes(b.status)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateBookingWorkflowStatus(params: {
  bookingId: string;
  toStatus: string;
  note?: string;
  quoteAmountFcfa?: number | null;
}): Promise<void> {
  const { data: previous } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", params.bookingId)
    .maybeSingle();

  const patch: Record<string, unknown> = { status: params.toStatus };
  if (params.quoteAmountFcfa != null) {
    patch.estimated_price = params.quoteAmountFcfa;
    patch.final_amount_fcfa = params.quoteAmountFcfa;
  }

  const { error } = await supabase.from("bookings").update(patch).eq("id", params.bookingId);
  if (error) throw error;

  await supabase.from("booking_status_history").insert({
    booking_id: params.bookingId,
    from_status: previous?.status ?? null,
    to_status: params.toStatus,
    note: params.note ?? null,
  });
}

export async function assignDispatch(params: {
  bookingId: string;
  driverId: string;
  vehicleId: string;
  /** Si true, refuse l’affectation en cas de conflit véhicule (défaut true). */
  enforceConflictCheck?: boolean;
}): Promise<void> {
  const enforce = params.enforceConflictCheck !== false;
  if (enforce) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("pickup_time")
      .eq("id", params.bookingId)
      .maybeSingle();
    if (booking?.pickup_time) {
      const { checkVehicleConflict } = await import("@/lib/engines/dispatchConflict");
      const conflict = await checkVehicleConflict({
        vehicleId: params.vehicleId,
        pickupAt: new Date(String(booking.pickup_time)),
        excludeBookingId: params.bookingId,
      });
      if (conflict.hasConflict) {
        throw new Error(
          `Conflit véhicule : déjà une mission dans ±${conflict.bufferMinutes} min (résa ${conflict.conflictingBookingIds
            .map((id) => id.slice(0, 8))
            .join(", ")}).`
        );
      }
    }
  }

  const { data: order, error: orderErr } = await supabase
    .from("service_orders")
    .select("id")
    .eq("booking_id", params.bookingId)
    .maybeSingle();
  if (orderErr) throw orderErr;

  let serviceOrderId = order?.id as string | undefined;
  if (!serviceOrderId) {
    const { data: created, error } = await supabase
      .from("service_orders")
      .insert({
        booking_id: params.bookingId,
        order_number: makeOrderNumber(),
        status: "assigned",
      })
      .select("id")
      .single();
    if (error) throw error;
    serviceOrderId = created.id as string;
  } else {
    await supabase.from("service_orders").update({ status: "assigned" }).eq("id", serviceOrderId);
  }

  const { data: existing } = await supabase
    .from("dispatch_assignments")
    .select("id")
    .eq("service_order_id", serviceOrderId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("dispatch_assignments")
      .update({
        driver_id: params.driverId,
        vehicle_id: params.vehicleId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("dispatch_assignments").insert({
      service_order_id: serviceOrderId,
      driver_id: params.driverId,
      vehicle_id: params.vehicleId,
    });
    if (error) throw error;
  }

  const { data: previous } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", params.bookingId)
    .maybeSingle();

  await supabase.from("bookings").update({ status: "chauffeur_assigne" }).eq("id", params.bookingId);
  await supabase.from("booking_status_history").insert({
    booking_id: params.bookingId,
    from_status: previous?.status ?? null,
    to_status: "chauffeur_assigne",
    note: "Dispatch: chauffeur et véhicule affectés",
  });
  await supabase.from("drivers").update({ status: "on_trip" }).eq("id", params.driverId);
  await supabase.from("vehicles").update({ status: "in_service" }).eq("id", params.vehicleId);
}

export async function createPaymentForBooking(input: {
  bookingId: string;
  amountFcfa: number;
  bookingRef?: string | null;
  providerRef?: string | null;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: input.bookingId,
      amount_fcfa: input.amountFcfa,
      booking_ref: input.bookingRef ?? null,
      provider_ref: input.providerRef ?? null,
      provider: "wave",
      status: input.status ?? "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  // maybeSingle() peut ne rien renvoyer pour une réservation anonyme (RLS ne permet pas la
  // relecture immédiate sans compte lié) — ce n'est pas une erreur, seul le lien de paiement
  // Wave dédié ne pourra pas être généré, avec repli automatique sur le lien marchand générique.
  return { id: data?.id as string | undefined, booking_id: input.bookingId, status: input.status ?? "pending" };
}

/**
 * Tente de créer une session de paiement Wave réelle pour ce paiement de réservation.
 * Si aucune clé Wave n'est configurée côté serveur (mode simulation), renvoie null pour que
 * l'appelant puisse retomber sur le lien Wave marchand générique déjà en place.
 */
export async function createBookingWaveCheckout(paymentId: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/checkout/wave/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ paymentId }),
    });
    const data = (await res.json().catch(() => ({}))) as { checkout_url?: string | null; simulation?: boolean };
    if (!res.ok || !data.checkout_url) return null;
    return data.checkout_url;
  } catch {
    return null;
  }
}

export async function markBookingPaid(bookingId: string, providerRef?: string) {
  const { data: previous } = await supabase.from("bookings").select("status").eq("id", bookingId).maybeSingle();
  await supabase.from("bookings").update({ status: "chauffeur_a_assigner" }).eq("id", bookingId);
  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    from_status: previous?.status ?? null,
    to_status: "chauffeur_a_assigner",
    note: "Paiement confirmé — en attente de dispatch",
  });
  if (providerRef) {
    await supabase
      .from("payments")
      .update({ status: "paid", provider_ref: providerRef, paid_at: new Date().toISOString() })
      .eq("booking_id", bookingId);
  }
}

export async function listMissionsForDriverUser(userId: string): Promise<PlatformBooking[]> {
  const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", userId).maybeSingle();
  if (!driver?.id) return [];
  const all = await listPlatformBookings();
  return all.filter((b) => b.service_order?.dispatch?.driver_id === driver.id);
}

export async function setOwnDriverStatus(userId: string, status: string): Promise<void> {
  const { error } = await supabase.from("drivers").update({ status }).eq("user_id", userId);
  if (error) throw error;
}

/** Statuts d'une mission que le chauffeur peut lui-même faire progresser, dans l'ordre. */
export const MISSION_STATUS_FLOW = [
  "chauffeur_assigne",
  "chauffeur_en_route",
  "chauffeur_arrive",
  "client_pris_en_charge",
  "en_cours",
  "terminee",
] as const;

export const MISSION_ACTION_LABEL: Record<string, string> = {
  chauffeur_en_route: "Je suis en route",
  chauffeur_arrive: "Je suis arrivé",
  client_pris_en_charge: "Client pris en charge",
  en_cours: "Client pris en charge",
  terminee: "Mission terminée",
};

/** Renvoie le prochain statut que le chauffeur peut déclencher, ou null si la mission est hors de son contrôle. */
export function nextMissionStatus(current: string): string | null {
  const idx = MISSION_STATUS_FLOW.indexOf(current as (typeof MISSION_STATUS_FLOW)[number]);
  if (idx === -1 || idx >= MISSION_STATUS_FLOW.length - 1) return null;
  return MISSION_STATUS_FLOW[idx + 1];
}

export async function advanceOwnMissionStatus(bookingId: string, newStatus: string): Promise<PlatformBooking> {
  const { data, error } = await supabase.rpc("update_own_mission_status", {
    p_booking_id: bookingId,
    p_new_status: newStatus,
  });
  if (error) {
    const messages: Record<string, string> = {
      not_authorized: "Cette mission ne vous est pas affectée.",
      invalid_transition: "Cette étape ne peut pas être déclenchée depuis le statut actuel.",
    };
    const key = Object.keys(messages).find((k) => (error.message || "").includes(k));
    throw new Error(key ? messages[key] : "Impossible de mettre à jour cette mission.");
  }
  return data as PlatformBooking;
}

export type PendingPayment = {
  id: string;
  booking_id: string;
  amount_fcfa: number;
  status: string;
  created_at: string;
  booking_ref: string | null;
};

/** Paiements en attente de vérification (staff) — visibilité déjà couverte par la RLS interne. */
export async function listPendingPayments(): Promise<PendingPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, booking_id, amount_fcfa, status, created_at, booking_ref")
    .in("status", ["pending", "initiated", "created"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingPayment[];
}

export async function reportMissionIssue(bookingId: string, message: string): Promise<void> {
  const { error } = await supabase.rpc("report_mission_issue", {
    p_booking_id: bookingId,
    p_message: message,
  });
  if (error) throw new Error("Impossible d’envoyer ce signalement.");
}

export async function getBookingById(id: string): Promise<PlatformBooking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, client_id, lead_id, status, pickup, dropoff, pickup_time, service_type,
       estimated_price, passengers, notes, pricing_segment, partner_contract_id, distance_km, created_at,
       cancellation_fee_fcfa, final_amount_fcfa, phone,
       client:clients(id, full_name, company_name, phone),
       service_orders(id, order_number, status,
         dispatch_assignments(id, driver_id, vehicle_id,
           driver:drivers(id, full_name, phone, status, user_id),
           vehicle:vehicles(id, brand, model, plate_number, seats, status, category)
         )
       )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw formatSupabaseError(error, "Impossible de charger cette réservation.");
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const order = firstRelation(r.service_orders as Record<string, unknown> | Record<string, unknown>[] | null);
  const dispatchRaw = order
    ? firstRelation(order.dispatch_assignments as Record<string, unknown> | Record<string, unknown>[] | null)
    : null;
  return {
    id: String(r.id),
    reference: (r.reference as string | null) ?? null,
    client_id: (r.client_id as string | null) ?? null,
    lead_id: (r.lead_id as string | null) ?? null,
    status: String(r.status),
    pickup: String(r.pickup),
    dropoff: String(r.dropoff),
    pickup_time: String(r.pickup_time),
    service_type: String(r.service_type),
    estimated_price: r.estimated_price == null ? null : Number(r.estimated_price),
    passengers: Number(r.passengers ?? 1),
    notes: (r.notes as string | null) ?? null,
    pricing_segment: String(r.pricing_segment ?? "client"),
    partner_contract_id: (r.partner_contract_id as string | null) ?? null,
    distance_km: r.distance_km == null ? null : Number(r.distance_km),
    created_at: String(r.created_at),
    client: (firstRelation(r.client as PlatformClient | PlatformClient[] | null) as PlatformBooking["client"]) ?? null,
    service_order: order
      ? {
          id: String(order.id),
          order_number: String(order.order_number),
          status: String(order.status),
          dispatch: dispatchRaw
            ? {
                id: String(dispatchRaw.id),
                driver_id: String(dispatchRaw.driver_id),
                vehicle_id: String(dispatchRaw.vehicle_id),
                driver: (firstRelation(dispatchRaw.driver as PlatformDriver | PlatformDriver[] | null) as PlatformDriver | null),
                vehicle: (firstRelation(dispatchRaw.vehicle as PlatformVehicle | PlatformVehicle[] | null) as PlatformVehicle | null),
              }
            : null,
        }
      : null,
  };
}

export type BookingStatusHistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

export async function listBookingStatusHistory(bookingId: string): Promise<BookingStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from("booking_status_history")
    .select("id, from_status, to_status, note, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BookingStatusHistoryRow[];
}

export type CancelOwnBookingResult = {
  id: string;
  status: string;
  cancellation_fee_fcfa: number | null;
  final_amount_fcfa: number | null;
};

/** Annulation client — le calcul des frais est effectué côté serveur (RPC `cancel_own_booking`). */
export async function cancelOwnBooking(bookingId: string): Promise<CancelOwnBookingResult> {
  const { data, error } = await supabase.rpc("cancel_own_booking", { p_booking_id: bookingId });
  if (error) {
    const code = error.message || "";
    const messages: Record<string, string> = {
      booking_not_found: "Réservation introuvable.",
      not_authorized: "Vous ne pouvez annuler que vos propres réservations.",
      booking_not_cancellable: "Cette réservation ne peut plus être annulée (déjà terminée, annulée ou remboursée).",
    };
    const key = Object.keys(messages).find((k) => code.includes(k));
    throw new Error(key ? messages[key] : "Impossible d’annuler cette réservation.");
  }
  return data as CancelOwnBookingResult;
}
