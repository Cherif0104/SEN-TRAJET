import { supabase } from "@/lib/supabase";

export type IntercityTripMode = "aller_simple" | "aller_retour";

export type IntercityVehicleOffer = {
  vehicleId: string;
  brand: string;
  model: string;
  category: string;
  seats: number;
  color: string | null;
  photoUrl: string | null;
  photoUrls: string[];
  luggageCapacity: string | null;
  isVerified: boolean;
  amountFcfa: number;
  multiplier: number;
};

export type IntercityQuote = {
  distanceKm: number;
  durationMinutes: number;
  distanceSource: "google_distance_matrix" | "osrm";
  serviceEndTime: string;
  offers: IntercityVehicleOffer[];
};

export type IntercityBookingResult = {
  bookingId: string;
  reference: string;
  amountFcfa: number;
  paymentId: string;
  serviceEndTime: string;
};

export type IntercityRouteInput = {
  pickup: string;
  dropoff: string;
  pickupTime: string;
  returnTime?: string | null;
  tripMode: IntercityTripMode;
  passengers: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
};

async function authFetch<T>(path: string, init: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connectez-vous pour continuer.");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Le service interurbain est momentanément indisponible.");
  }
  return payload;
}

export async function createIntercityQuote(input: IntercityRouteInput): Promise<IntercityQuote> {
  const payload = await authFetch<{ quote: IntercityQuote }>("/api/intercity/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.quote;
}

export async function createIntercityBooking(
  input: IntercityRouteInput & { vehicleId: string; phone: string },
): Promise<IntercityBookingResult> {
  const payload = await authFetch<{ booking: IntercityBookingResult }>("/api/intercity/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.booking;
}

export async function startIntercityPayment(
  paymentId: string,
): Promise<{ simulation: boolean; checkoutUrl: string | null }> {
  const payload = await authFetch<{ simulation: boolean; checkout_url: string | null }>(
    "/api/checkout/wave/booking",
    { method: "POST", body: JSON.stringify({ paymentId }) },
  );
  return { simulation: payload.simulation, checkoutUrl: payload.checkout_url };
}
