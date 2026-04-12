import { supabase } from "@/lib/supabase";
import { textIncludesNormalized } from "@/lib/search";
import type { PickupMode } from "@/lib/pricing";

export type TripType =
  | "interurbain_location"
  | "interurbain_covoiturage"
  | "urbain"
  | "aeroport"
  | "colis";

export type Trip = {
  id: string;
  driver: string;
  rating: number;
  reviews: number;
  departure: string;
  arrival: string;
  from: string;
  to: string;
  km: number;
  duration: string;
  vehicle: string;
  category: string;
  seats: string;
  price: number;
  basePrice?: number;
  pickupMode?: PickupMode;
  homePickupExtraFcfa?: number;
  tripType?: TripType | null;
};

function filterTrips(trips: Trip[], depart: string, destination: string): Trip[] {
  return trips.filter(
    (trip) =>
      textIncludesNormalized(trip.from, depart) &&
      textIncludesNormalized(trip.to, destination)
  );
}

function toDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function toHourLabel(raw: string | null): string {
  if (!raw) return "--:--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function hasSupabasePublicConfig(): boolean {
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(publicKey) &&
    !String(process.env.NEXT_PUBLIC_SUPABASE_URL).includes("xxxxxxxx")
    ? true
    : false;
}

export async function searchTrips(params: {
  depart: string;
  destination: string;
  date?: string;
  /** Budget max du client (FCFA) — filtre les trajets au prix inférieur ou égal */
  maxPriceFcfa?: number;
  pickupMode?: PickupMode;
}): Promise<Trip[]> {
  const { depart, destination, date: dateParam, maxPriceFcfa, pickupMode = "driver_point" } = params;

  if (!hasSupabasePublicConfig()) {
    return [];
  }

  try {
    let q = supabase
      .from("trips")
      .select("*")
      .eq("status", "active")
      .gt("available_seats", 0)
      .ilike("from_city", `%${depart}%`)
      .ilike("to_city", `%${destination}%`)
      .order("departure_time", { ascending: true })
      .limit(50);

    if (dateParam) {
      const start = new Date(`${dateParam}T00:00:00.000Z`);
      const end = new Date(`${dateParam}T23:59:59.999Z`);
      q = q.gte("departure_time", start.toISOString()).lte("departure_time", end.toISOString());
    }

    if (maxPriceFcfa != null && maxPriceFcfa > 0) {
      const adjustedBudget = pickupMode === "home_pickup" ? Math.max(0, maxPriceFcfa - 2000) : maxPriceFcfa;
      q = q.lte("price_fcfa", adjustedBudget);
    }

    const { data, error } = await q;

    if (error) {
      console.error("[searchTrips]", error);
      return [];
    }
    if (!data || !Array.isArray(data)) return [];

    const normalizedTrips: Trip[] = data.map((row: Record<string, unknown>) => {
      const availableSeats = Number(row.available_seats ?? 0);
      const totalSeats = Number(row.total_seats ?? 4);
      return {
        id: String(row.id ?? ""),
        driver: String(row.driver_name ?? "Chauffeur"),
        rating: Number(row.rating ?? 0),
        reviews: Number(row.reviews ?? 0),
        departure: toHourLabel(String(row.departure_time ?? "")),
        arrival: toHourLabel(String(row.arrival_time ?? "")),
        from: String(row.from_city ?? ""),
        to: String(row.to_city ?? ""),
        km: Number(row.distance_km ?? 0),
        duration: toDuration(Number(row.duration_minutes ?? 0)),
        vehicle: String(row.vehicle_name ?? "Véhicule"),
        category: String(row.vehicle_category ?? "Standard"),
        seats: `${Math.max(availableSeats, 0)}/${Math.max(totalSeats, 1)}`,
        basePrice: Number(row.base_price_fcfa ?? row.price_fcfa ?? 0),
        homePickupExtraFcfa: Number(row.home_pickup_extra_fcfa ?? 2000),
        pickupMode: (row.pickup_mode as PickupMode) ?? "driver_point",
        price:
          Number(row.base_price_fcfa ?? row.price_fcfa ?? 0) +
          (pickupMode === "home_pickup" ? Number(row.home_pickup_extra_fcfa ?? 2000) : 0),
        tripType: (row.trip_type as TripType) ?? "interurbain_covoiturage",
      };
    });

    return filterTrips(normalizedTrips, depart, destination);
  } catch (err) {
    console.error("[searchTrips]", err);
    return [];
  }
}

