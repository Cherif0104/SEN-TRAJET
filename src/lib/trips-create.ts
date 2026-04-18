import { supabase } from "@/lib/supabase";
import type { PickupMode } from "@/lib/pricing";
import { getDriverPublishingReadiness } from "@/lib/driverReadiness";

export type CreateTripParams = {
  driverId: string;
  driverName: string;
  fromCity: string;
  toCity: string;
  fromPlace?: string;
  toPlace?: string;
  departureTime: string; // ISO string
  arrivalTime?: string; // ISO string, optional
  distanceKm?: number;
  durationMinutes?: number;
  vehicleName?: string;
  vehicleCategory?: string;
  totalSeats: number;
  availableSeats: number;
  priceFcfa: number;
  pickupMode?: PickupMode;
  driverPickupPointLabel?: string;
  driverPickupLat?: number;
  driverPickupLng?: number;
  homePickupExtraFcfa?: number;
  tripType?: "interurbain_location" | "interurbain_covoiturage" | "urbain" | "aeroport" | "colis";
};

export async function createTrip(params: CreateTripParams) {
  if (params.priceFcfa <= 0) throw new Error("Le prix doit être supérieur à 0.");
  if (params.totalSeats < 1 || params.availableSeats < 1) throw new Error("Nombre de places invalide.");
  const readiness = await getDriverPublishingReadiness(params.driverId);
  if (!readiness.ready) {
    throw new Error("Profil chauffeur incomplet. Complétez votre profil, véhicule et documents avant de publier.");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée. Reconnectez-vous avant de publier un trajet.");
  }

  const res = await fetch("/api/chauffeur/trips/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      payload: params,
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? undefined,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; trip?: unknown };
  if (!res.ok) {
    throw new Error(json.error ?? "Erreur lors de la publication du trajet.");
  }
  return json.trip;
}
