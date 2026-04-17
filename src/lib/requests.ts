import { supabase } from "@/lib/supabase";
import type { TripType } from "@/lib/trips";
import type { PickupMode } from "@/lib/pricing";
import { sortRequestsForDriver } from "@/lib/requestMatching";

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
  parcel_type: string | null;
  parcel_weight_kg: number | null;
  parcel_volume_label: string | null;
  parcel_quantity: number | null;
  is_fragile: boolean;
  pickup_address: string | null;
  delivery_address: string | null;
  declared_value_fcfa: number | null;
  colis_dispatch_mode: "direct_trip" | "depot_assiste";
  preferred_vehicle_type: string | null;
  requested_vehicle_category:
    | "citadine"
    | "suv_berline"
    | "familiale"
    | "minivan"
    | "minibus"
    | "bus"
    | null;
  requested_service_class: "eco" | "confort" | "confort_plus" | "premium" | "premium_plus" | null;
  urgency_level: "normal" | "urgent" | "express";
  relay_dropoff_label: string | null;
  support_callback_requested: boolean;
  status: "open" | "matched" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
  client?: { full_name: string; average_rating: number; total_reviews: number };
};

export type ParcelDetails = {
  parcelType?: string;
  parcelWeightKg?: number;
  parcelVolumeLabel?: string;
  parcelQuantity?: number;
  isFragile?: boolean;
  pickupAddress?: string;
  deliveryAddress?: string;
  declaredValueFcfa?: number;
  colisDispatchMode?: "direct_trip" | "depot_assiste";
  preferredVehicleType?: string;
  requestedVehicleCategory?: "citadine" | "suv_berline" | "familiale" | "minivan" | "minibus" | "bus";
  requestedServiceClass?: "eco" | "confort" | "confort_plus" | "premium" | "premium_plus";
  urgencyLevel?: "normal" | "urgent" | "express";
  relayDropoffLabel?: string;
  supportCallbackRequested?: boolean;
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
  parcelDetails?: ParcelDetails;
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
      parcel_type: params.parcelDetails?.parcelType ?? null,
      parcel_weight_kg: params.parcelDetails?.parcelWeightKg ?? null,
      parcel_volume_label: params.parcelDetails?.parcelVolumeLabel ?? null,
      parcel_quantity: params.parcelDetails?.parcelQuantity ?? null,
      is_fragile: params.parcelDetails?.isFragile ?? false,
      pickup_address: params.parcelDetails?.pickupAddress ?? null,
      delivery_address: params.parcelDetails?.deliveryAddress ?? null,
      declared_value_fcfa: params.parcelDetails?.declaredValueFcfa ?? null,
      colis_dispatch_mode: params.parcelDetails?.colisDispatchMode ?? "direct_trip",
      preferred_vehicle_type: params.parcelDetails?.preferredVehicleType ?? null,
      requested_vehicle_category:
        params.parcelDetails?.requestedVehicleCategory ??
        params.parcelDetails?.preferredVehicleType ??
        null,
      requested_service_class: params.parcelDetails?.requestedServiceClass ?? null,
      urgency_level: params.parcelDetails?.urgencyLevel ?? "normal",
      relay_dropoff_label: params.parcelDetails?.relayDropoffLabel ?? null,
      support_callback_requested: params.parcelDetails?.supportCallbackRequested ?? false,
    };

  const { data, error } = await supabase.from("trip_requests").insert(payload).select().single();
  if (error) {
    throw new Error(`Impossible de créer la demande: ${error.message}`);
  }
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

  const { data: notifiedRows } = await supabase
    .from("driver_match_notifications")
    .select("request_id")
    .eq("driver_id", driverId)
    .not("request_id", "is", null);
  const excludedRequestIds = new Set(
    (notifiedRows ?? [])
      .map((row) => String((row as { request_id?: string | null }).request_id ?? ""))
      .filter(Boolean)
  );

  const eligible = requests.filter((req) => !excludedRequestIds.has(req.id));
  return sortRequestsForDriver(eligible, {
    profileCity: String(profile?.city ?? ""),
    vehicleCategories: categories,
  });
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
