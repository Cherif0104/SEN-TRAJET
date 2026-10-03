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
