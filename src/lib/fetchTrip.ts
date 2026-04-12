import { supabase } from "@/lib/supabase";

export interface TripDetail {
  id: string;
  driverId: string | null;
  fromCity: string;
  toCity: string;
  fromPlace: string | null;
  toPlace: string | null;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  distanceKm: number;
  durationMinutes: number;
  durationLabel: string;
  vehicleName: string;
  vehicleCategory: string;
  totalSeats: number;
  availableSeats: number;
  priceFcfa: number;
  rating: number;
  reviews: number;
  tripType: string | null;
}

function toHour(raw: string | null): string {
  if (!raw) return "--:--";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function toDurationLabel(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export async function fetchTripById(
  id: string
): Promise<TripDetail | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("id,driver_id,from_city,to_city,from_place,to_place,driver_name,departure_time,arrival_time,distance_km,duration_minutes,vehicle_name,vehicle_category,total_seats,available_seats,price_fcfa,rating,reviews,trip_type")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error || !data) return null;

  const durationMinutes = Number(data.duration_minutes ?? 0);

  return {
    id: String(data.id),
    driverId: data.driver_id ?? null,
    fromCity: String(data.from_city ?? ""),
    toCity: String(data.to_city ?? ""),
    fromPlace: data.from_place ? String(data.from_place) : null,
    toPlace: data.to_place ? String(data.to_place) : null,
    driverName: String(data.driver_name ?? ""),
    departureTime: toHour(String(data.departure_time ?? "")),
    arrivalTime: toHour(String(data.arrival_time ?? "")),
    distanceKm: Number(data.distance_km ?? 0),
    durationMinutes,
    durationLabel: toDurationLabel(durationMinutes),
    vehicleName: String(data.vehicle_name ?? ""),
    vehicleCategory: String(data.vehicle_category ?? "Standard"),
    totalSeats: Number(data.total_seats ?? 4),
    availableSeats: Number(data.available_seats ?? 4),
    priceFcfa: Number(data.price_fcfa ?? 0),
    rating: Number(data.rating ?? 0),
    reviews: Number(data.reviews ?? 0),
    tripType: data.trip_type as string | null,
  };
}
