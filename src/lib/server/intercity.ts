import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IntercityTripMode,
  IntercityVehicleOffer,
} from "@/lib/intercityService";
import { getDrivingDistance } from "@/lib/server/drivingDistance";

export type IntercityRouteRequest = {
  pickup: string;
  dropoff: string;
  pickupTime: string;
  returnTime: string | null;
  tripMode: IntercityTripMode;
  passengers: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
};

type VehicleRecord = {
  id?: unknown;
  brand?: unknown;
  model?: unknown;
  category?: unknown;
  seats?: unknown;
  color?: unknown;
  photo_url?: unknown;
  photo_urls?: unknown;
  luggage_capacity?: unknown;
  is_verified?: unknown;
  status?: unknown;
  fleet_source?: unknown;
};

function asPhotoList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function vehicleMultiplier(category: string, seats: number): number {
  const normalized = category.toLowerCase();
  if (normalized === "vip") return 1.35;
  if (normalized.includes("van") || seats >= 8) return 1.2;
  if (normalized === "premium") return 1.1;
  return 1;
}

export function parseIntercityRouteRequest(value: unknown): IntercityRouteRequest | null {
  const body = (value ?? {}) as Record<string, unknown>;
  const pickupTime = new Date(String(body.pickupTime ?? ""));
  const tripMode = body.tripMode;
  const returnTime = body.returnTime ? new Date(String(body.returnTime)) : null;
  const passengers = Number(body.passengers);
  const coordinates = [
    body.pickupLat,
    body.pickupLng,
    body.dropoffLat,
    body.dropoffLng,
  ].map(Number);

  if (
    typeof body.pickup !== "string" ||
    !body.pickup.trim() ||
    typeof body.dropoff !== "string" ||
    !body.dropoff.trim() ||
    !Number.isFinite(pickupTime.getTime()) ||
    pickupTime.getTime() <= Date.now() + 2 * 60 * 60_000 ||
    (tripMode !== "aller_simple" && tripMode !== "aller_retour") ||
    !Number.isInteger(passengers) ||
    passengers < 1 ||
    passengers > 60 ||
    coordinates.some((coordinate) => !Number.isFinite(coordinate)) ||
    Math.abs(coordinates[0]) > 90 ||
    Math.abs(coordinates[2]) > 90 ||
    Math.abs(coordinates[1]) > 180 ||
    Math.abs(coordinates[3]) > 180
  ) {
    return null;
  }

  if (
    tripMode === "aller_retour" &&
    (!returnTime || returnTime.getTime() <= pickupTime.getTime())
  ) {
    return null;
  }

  return {
    pickup: body.pickup.trim(),
    dropoff: body.dropoff.trim(),
    pickupTime: pickupTime.toISOString(),
    returnTime: returnTime?.toISOString() ?? null,
    tripMode,
    passengers,
    pickupLat: coordinates[0],
    pickupLng: coordinates[1],
    dropoffLat: coordinates[2],
    dropoffLng: coordinates[3],
  };
}

export async function buildIntercityQuote(
  admin: SupabaseClient,
  input: IntercityRouteRequest,
) {
  const distance = await getDrivingDistance({
    fromLat: input.pickupLat,
    fromLng: input.pickupLng,
    toLat: input.dropoffLat,
    toLng: input.dropoffLng,
  });
  if (!distance) throw new Error("intercity_route_unavailable");

  const pickupTime = new Date(input.pickupTime);
  const returnTime = input.returnTime ? new Date(input.returnTime) : null;
  const serviceEndTime =
    input.tripMode === "aller_retour" && returnTime
      ? new Date(returnTime.getTime() + distance.durationMinutes * 60_000)
      : new Date(
          pickupTime.getTime() + (distance.durationMinutes + 120) * 60_000,
        );

  const [
    { data: tariffs, error: tariffError },
    { data: rows, error: offersError },
    { data: conflicts, error: conflictsError },
  ] = await Promise.all([
    admin
      .from("sentrajet_tariffs")
      .select("rule_key, amount_fcfa")
      .eq("segment", "client")
      .eq("is_active", true)
      .in("rule_key", ["interurbain_km", "interurbain_min"]),
    admin.from("vip_vehicle_offers").select(`
      vehicle_id,
      vehicle:vehicles!inner(
        id, brand, model, category, seats, color, photo_url, photo_urls,
        luggage_capacity, is_verified, status, fleet_source
      )
    `).eq("status", "active").eq("vehicle.fleet_source", "owned"),
    admin
      .from("bookings")
      .select("requested_vehicle_id")
      .not("requested_vehicle_id", "is", null)
      .not("service_end_time", "is", null)
      .lt("pickup_time", serviceEndTime.toISOString())
      .gt("service_end_time", pickupTime.toISOString())
      .not(
        "status",
        "in",
        '("annulee","cancelled","terminee","completed","refusee","expired")',
      ),
  ]);
  if (tariffError || offersError || conflictsError) {
    throw tariffError ?? offersError ?? conflictsError;
  }

  const tariffMap = new Map(
    (tariffs ?? []).map((row) => [String(row.rule_key), Number(row.amount_fcfa)]),
  );
  const rateFcfa = tariffMap.get("interurbain_km") || 850;
  const minimumFcfa = tariffMap.get("interurbain_min") || 30_000;
  const unavailable = new Set(
    (conflicts ?? []).map((row) => String(row.requested_vehicle_id)),
  );

  const offers = (rows ?? []).flatMap((row): IntercityVehicleOffer[] => {
    const vehicle = (Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle) as
      | VehicleRecord
      | null;
    const vehicleId = String(row.vehicle_id ?? "");
    const seats = Number(vehicle?.seats ?? 0);
    const category = String(vehicle?.category ?? "Premium");
    if (
      !vehicle ||
      unavailable.has(vehicleId) ||
      seats < input.passengers ||
      !["available", "in_service"].includes(String(vehicle.status ?? "").toLowerCase())
    ) {
      return [];
    }

    const multiplier = vehicleMultiplier(category, seats);
    const rawAmount =
      distance.distanceKm *
      rateFcfa *
      multiplier *
      (input.tripMode === "aller_retour" ? 1.8 : 1);
    return [{
      vehicleId,
      brand: String(vehicle.brand ?? ""),
      model: String(vehicle.model ?? ""),
      category,
      seats,
      color: vehicle.color ? String(vehicle.color) : null,
      photoUrl: vehicle.photo_url ? String(vehicle.photo_url) : null,
      photoUrls: asPhotoList(vehicle.photo_urls),
      luggageCapacity: vehicle.luggage_capacity
        ? String(vehicle.luggage_capacity)
        : null,
      isVerified: Boolean(vehicle.is_verified),
      amountFcfa: Math.max(minimumFcfa, Math.ceil(rawAmount / 500) * 500),
      multiplier,
    }];
  }).sort((a, b) => a.amountFcfa - b.amountFcfa);

  return {
    distanceKm: distance.distanceKm,
    durationMinutes: distance.durationMinutes,
    distanceSource: distance.source,
    serviceEndTime: serviceEndTime.toISOString(),
    offers,
  };
}
