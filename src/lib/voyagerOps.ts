import { supabase } from "@/lib/supabase";

export type VoyagerDeparture = {
  id: string;
  departureAt: string;
  vehicleType: "citadine" | "berline" | "suv" | "minivan" | "minibus" | "bus";
  vehicleLabel: string | null;
  seatsTotal: number;
  seatsAvailable: number;
  pricePerSeatFcfa: number;
  notes: string | null;
  line: {
    id: string;
    originCity: string;
    destinationCity: string;
    regionLabel: string | null;
    boardingPoint: string;
    arrivalPoint: string;
    operator: {
      id: string;
      displayName: string;
      operatorKind: string;
    };
  };
};

export type VoyagerBooking = {
  id: string;
  reference: string;
  departureId: string;
  seatsBooked: number;
  amountFcfa: number;
  paymentStatus: string;
  status: string;
  expiresAt: string;
};

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connectez-vous pour utiliser Voyager.");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Voyager est momentanément indisponible.");
  return payload;
}

export async function searchVoyagerDepartures(filters: {
  origin?: string;
  destination?: string;
  date?: string;
}): Promise<VoyagerDeparture[]> {
  const query = new URLSearchParams();
  if (filters.origin) query.set("origin", filters.origin);
  if (filters.destination) query.set("destination", filters.destination);
  if (filters.date) query.set("date", filters.date);
  const payload = await authFetch<{ departures: VoyagerDeparture[] }>(
    `/api/voyager/departures${query.size ? `?${query}` : ""}`,
  );
  return payload.departures;
}

export async function createVoyagerBooking(input: {
  departureId: string;
  fullName: string;
  phone: string;
  seats: number;
}): Promise<VoyagerBooking> {
  const payload = await authFetch<{ booking: VoyagerBooking }>("/api/voyager/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.booking;
}

export async function startVoyagerPayment(
  bookingId: string,
): Promise<{ simulation: boolean; checkoutUrl: string | null }> {
  const payload = await authFetch<{ simulation: boolean; checkout_url: string | null }>(
    "/api/checkout/wave/voyager",
    {
      method: "POST",
      body: JSON.stringify({ bookingId }),
    },
  );
  return {
    simulation: payload.simulation,
    checkoutUrl: payload.checkout_url,
  };
}
