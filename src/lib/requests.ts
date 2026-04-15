import { supabase } from "@/lib/supabase";
import type { TripType } from "@/lib/trips";
import type { PickupMode } from "@/lib/pricing";

export type TripRequest = {
  id: string;
  client_id: string;
  from_city: string;
  to_city: string;
  from_place: string | null;
  to_place: string | null;
  pickup_mode: PickupMode;
  driver_pickup_point_label: string | null;
  home_pickup_extra_fcfa: number;
  departure_date: string;
  departure_time_range: string;
  passengers: number;
  trip_type: TripType;
  notes: string | null;
  budget_fcfa: number | null;
  status: "open" | "matched" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
  client?: { full_name: string; average_rating: number; total_reviews: number };
};

export async function createRequest(params: {
  clientId: string;
  fromCity: string;
  toCity: string;
  fromPlace?: string;
  toPlace?: string;
  departureDate: string;
  departureTimeRange?: string;
  passengers: number;
  tripType: TripType;
  notes?: string;
  budgetFcfa?: number;
  pickupMode?: PickupMode;
  driverPickupPointLabel?: string;
  homePickupExtraFcfa?: number;
}) {
  const payload = {
      client_id: params.clientId,
      from_city: params.fromCity,
      to_city: params.toCity,
      from_place: params.fromPlace || null,
      to_place: params.toPlace || null,
      pickup_mode: params.pickupMode ?? "driver_point",
      driver_pickup_point_label: params.driverPickupPointLabel ?? null,
      home_pickup_extra_fcfa: params.homePickupExtraFcfa ?? 2000,
      departure_date: params.departureDate,
      departure_time_range: params.departureTimeRange || "flexible",
      passengers: params.passengers,
      trip_type: params.tripType,
      notes: params.notes || null,
      budget_fcfa: params.budgetFcfa ?? null,
    };

  let { data, error } = await supabase.from("trip_requests").insert(payload).select().single();

  // Backward compatibility for environments without migration.
  if (error && String(error.message).includes("column")) {
    ({ data, error } = await supabase
      .from("trip_requests")
      .insert({
        client_id: params.clientId,
        from_city: params.fromCity,
        to_city: params.toCity,
        from_place: params.fromPlace || null,
        to_place: params.toPlace || null,
        departure_date: params.departureDate,
        departure_time_range: params.departureTimeRange || "flexible",
        passengers: params.passengers,
        trip_type: params.tripType,
        notes: params.notes || null,
        budget_fcfa: params.budgetFcfa ?? null,
      })
      .select()
      .single());
  }
  if (error) throw error;
  return data;
}

export async function cancelRequest(requestId: string) {
  const { error } = await supabase
    .from("trip_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);
  if (error) throw error;
}

export async function getOpenRequests(filters?: { fromCity?: string; toCity?: string }) {
  let query = supabase
    .from("trip_requests")
    .select("*, client:profiles!client_id(full_name, average_rating, total_reviews)")
    .eq("status", "open")
    .gte("departure_date", new Date().toISOString().split("T")[0])
    .order("departure_date", { ascending: true });

  if (filters?.fromCity) query = query.ilike("from_city", `%${filters.fromCity}%`);
  if (filters?.toCity) query = query.ilike("to_city", `%${filters.toCity}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TripRequest[];
}

export async function getOpenRequestsForDriver(driverId: string, filters?: { fromCity?: string; toCity?: string }) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", driverId)
    .maybeSingle();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("category")
    .eq("driver_id", driverId);

  const categories = new Set((vehicles ?? []).map((v) => String(v.category || "").toLowerCase()));
  let query = supabase
    .from("trip_requests")
    .select("*, client:profiles!client_id(full_name, average_rating, total_reviews)")
    .eq("status", "open")
    .gte("departure_date", new Date().toISOString().split("T")[0])
    .order("departure_date", { ascending: true })
    .limit(150);

  if (filters?.fromCity) query = query.ilike("from_city", `%${filters.fromCity}%`);
  if (filters?.toCity) query = query.ilike("to_city", `%${filters.toCity}%`);

  const { data, error } = await query;
  if (error) throw error;
  const requests = (data ?? []) as TripRequest[];
  const profileCity = String(profile?.city ?? "").trim().toLowerCase();

  return requests
    .map((req) => {
      const fromMatch = profileCity ? req.from_city.toLowerCase().includes(profileCity) : false;
      const toMatch = profileCity ? req.to_city.toLowerCase().includes(profileCity) : false;
      const locationScore = fromMatch ? 3 : toMatch ? 2 : 1;
      const tripType = req.trip_type;
      const categoryScore =
        tripType === "colis" && categories.has("utilitaire")
          ? 3
          : (tripType === "interurbain_location" || tripType === "interurbain_covoiturage") &&
              (categories.has("confort") || categories.has("premium") || categories.has("standard"))
            ? 2
            : 1;
      return { ...req, _score: locationScore * 10 + categoryScore };
    })
    .sort((a, b) => b._score - a._score || a.departure_date.localeCompare(b.departure_date))
    .map(({ _score, ...req }) => req);
}

export async function getMyRequests(userId: string) {
  const { data, error } = await supabase
    .from("trip_requests")
    .select("*")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TripRequest[];
}

export async function getRequestById(requestId: string) {
  const { data, error } = await supabase
    .from("trip_requests")
    .select("*, client:profiles!client_id(full_name, average_rating, total_reviews)")
    .eq("id", requestId)
    .single();
  if (error) throw error;
  return data as TripRequest;
}
