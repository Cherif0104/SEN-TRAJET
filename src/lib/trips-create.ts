import { supabase } from "@/lib/supabase";
import { computePriceBreakdown, type PickupMode } from "@/lib/pricing";

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
  const pickupMode = params.pickupMode ?? "driver_point";
  const price = await computePriceBreakdown({
    basePriceFcfa: params.priceFcfa,
    pickupMode,
    homePickupExtraFcfa: params.homePickupExtraFcfa,
  });

  const payload = {
    driver_id: params.driverId,
    driver_name: params.driverName,
    pickup_mode: pickupMode,
    driver_pickup_point_label: params.driverPickupPointLabel ?? null,
    driver_pickup_lat: params.driverPickupLat ?? null,
    driver_pickup_lng: params.driverPickupLng ?? null,
    from_city: params.fromCity,
    to_city: params.toCity,
    from_place: params.fromPlace || null,
    to_place: params.toPlace || null,
    departure_time: params.departureTime,
    arrival_time: params.arrivalTime || null,
    distance_km: params.distanceKm ?? 0,
    duration_minutes: params.durationMinutes ?? 0,
    vehicle_name: params.vehicleName || null,
    vehicle_category: params.vehicleCategory || "Standard",
    total_seats: params.totalSeats,
    available_seats: Math.min(params.availableSeats, params.totalSeats),
    base_price_fcfa: price.basePriceFcfa,
    home_pickup_extra_fcfa: price.pickupExtraFcfa > 0 ? price.pickupExtraFcfa : params.homePickupExtraFcfa ?? 2000,
    price_fcfa: price.basePriceFcfa,
    status: "active",
    trip_type: params.tripType || "interurbain_covoiturage",
  };

  let query = supabase
    .from("trips")
    .insert(payload)
    .select()
    .single();

  let { data, error } = await query;

  // Backward compatibility for environments where migration is not applied yet.
  if (error && String(error.message).includes("column")) {
    const legacyPayload = {
      driver_id: params.driverId,
      driver_name: params.driverName,
      from_city: params.fromCity,
      to_city: params.toCity,
      from_place: params.fromPlace || null,
      to_place: params.toPlace || null,
      departure_time: params.departureTime,
      arrival_time: params.arrivalTime || null,
      distance_km: params.distanceKm ?? 0,
      duration_minutes: params.durationMinutes ?? 0,
      vehicle_name: params.vehicleName || null,
      vehicle_category: params.vehicleCategory || "Standard",
      total_seats: params.totalSeats,
      available_seats: Math.min(params.availableSeats, params.totalSeats),
      price_fcfa: price.basePriceFcfa,
      status: "active",
      trip_type: params.tripType || "interurbain_covoiturage",
    };
    ({ data, error } = await supabase.from("trips").insert(legacyPayload).select().single());
  }

  if (error) throw error;
  return data;
}
