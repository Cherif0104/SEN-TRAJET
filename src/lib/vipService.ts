import { supabase } from "@/lib/supabase";

export type VipDuration = 4 | 8 | 12;

export type VipVehicleOffer = {
  id: string;
  vehicleId: string;
  brand: string;
  model: string;
  category: string;
  seats: number;
  color: string | null;
  photoUrl: string | null;
  photoUrls: string[];
  tagline: string | null;
  luggageCapacity: string | null;
  isVerified: boolean;
  price4hFcfa: number;
  price8hFcfa: number;
  price12hFcfa: number;
  includedKm4h: number;
  includedKm8h: number;
  includedKm12h: number;
  extraKmRateFcfa: number;
};

export type VipBookingResult = {
  bookingId: string;
  reference: string;
  status: string;
  pickupTime: string;
  serviceEndTime: string;
  amountFcfa: number;
  paymentId: string;
  paymentStatus: string;
};

export type VipFleetRecommendation = {
  passengers: number;
  durationHours: number;
  ownedFleet: Array<{ vehicleId: string; label: string; seats: number }>;
  ownedVehiclesCount: number;
  ownedSeatsAvailable: number;
  additionalPassengersToCover: number;
  externalPlan: {
    type: string;
    units: number;
    nominalSeats?: number | null;
    buses?: number;
    minivans?: number;
  };
};

export type VipQuoteRequest = {
  id: string;
  reference: string;
  requester_type: string;
  organization_name: string | null;
  contact_phone: string;
  pickup_location: string;
  starts_at: string;
  ends_at: string;
  passengers: number;
  vehicle_preference: string;
  event_type: string | null;
  fleet_recommendation: VipFleetRecommendation;
  notes: string | null;
  status: string;
  quoted_amount_fcfa: number | null;
  created_at: string;
};

export function vipPrice(offer: VipVehicleOffer, duration: VipDuration): number {
  return duration === 4
    ? offer.price4hFcfa
    : duration === 8
      ? offer.price8hFcfa
      : offer.price12hFcfa;
}

export function vipIncludedKm(offer: VipVehicleOffer, duration: VipDuration): number {
  return duration === 4
    ? offer.includedKm4h
    : duration === 8
      ? offer.includedKm8h
      : offer.includedKm12h;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connectez-vous pour continuer.");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Le service VIP est indisponible.");
  return payload;
}

export async function listVipOffers(input: {
  pickupTime: string;
  durationHours: VipDuration;
  passengers: number;
}): Promise<VipVehicleOffer[]> {
  const query = new URLSearchParams({
    pickupTime: input.pickupTime,
    durationHours: String(input.durationHours),
    passengers: String(input.passengers),
  });
  const payload = await authFetch<{ offers: VipVehicleOffer[] }>(`/api/vip/offers?${query}`);
  return payload.offers;
}

export async function createVipBooking(input: {
  vehicleId: string;
  pickup: string;
  pickupTime: string;
  durationHours: VipDuration;
  passengers: number;
  phone: string;
  pickupLat?: number;
  pickupLng?: number;
  notes?: string;
}): Promise<VipBookingResult> {
  const payload = await authFetch<{ booking: VipBookingResult }>("/api/vip/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.booking;
}

export async function startVipPayment(paymentId: string): Promise<{ simulation: boolean; checkoutUrl: string | null }> {
  const payload = await authFetch<{ simulation: boolean; checkout_url: string | null }>(
    "/api/checkout/wave/booking",
    { method: "POST", body: JSON.stringify({ paymentId }) },
  );
  return { simulation: payload.simulation, checkoutUrl: payload.checkout_url };
}

export async function createVipQuote(input: {
  requesterType: "particulier" | "conciergerie" | "hotel" | "entreprise" | "evenement";
  organizationName?: string;
  contactPhone: string;
  pickupLocation: string;
  startsAt: string;
  endsAt: string;
  passengers: number;
  vehiclePreference: "optimal" | "minivans" | "bus" | "mixte";
  eventType?: string;
  notes?: string;
}): Promise<{
  quote: { id: string; reference: string; status: string };
  recommendation: VipFleetRecommendation;
}> {
  return authFetch("/api/vip/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listVipQuoteRequests(): Promise<VipQuoteRequest[]> {
  const { data, error } = await supabase
    .from("vip_quote_requests")
    .select("*")
    .in("status", ["nouvelle", "en_etude", "devis_envoye", "acceptee"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VipQuoteRequest[];
}

export async function updateVipQuoteRequest(
  id: string,
  input: { status: string; quotedAmountFcfa?: number | null },
): Promise<void> {
  const patch: Record<string, unknown> = { status: input.status };
  if (input.quotedAmountFcfa != null) {
    patch.quoted_amount_fcfa = input.quotedAmountFcfa;
    patch.quoted_at = new Date().toISOString();
  }
  const { error } = await supabase.from("vip_quote_requests").update(patch).eq("id", id);
  if (error) throw error;
}
