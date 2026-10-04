import "server-only";

import { ceilDistanceKm } from "@/lib/routeDistances";

export type DrivingDistance = {
  distanceKm: number;
  durationMinutes: number;
  baselineDurationMinutes: number;
  source: "google_distance_matrix" | "osrm";
};

export type RouteCoordinates = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

function validCoordinates(route: RouteCoordinates): boolean {
  return (
    Number.isFinite(route.fromLat) &&
    Number.isFinite(route.fromLng) &&
    Number.isFinite(route.toLat) &&
    Number.isFinite(route.toLng) &&
    Math.abs(route.fromLat) <= 90 &&
    Math.abs(route.toLat) <= 90 &&
    Math.abs(route.fromLng) <= 180 &&
    Math.abs(route.toLng) <= 180
  );
}

async function googleDistance(route: RouteCoordinates): Promise<DrivingDistance | null> {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${route.fromLat},${route.fromLng}`);
  url.searchParams.set("destinations", `${route.toLat},${route.toLng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "fr");
  url.searchParams.set("departure_time", "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value: number };
        duration?: { value: number };
        duration_in_traffic?: { value: number };
      }>;
    }>;
  };
  const result = payload.rows?.[0]?.elements?.[0];
  if (result?.status !== "OK" || !result.distance?.value || !result.duration?.value) return null;

  return {
    distanceKm: ceilDistanceKm(result.distance.value / 1000),
    durationMinutes: Math.max(
      1,
      Math.round((result.duration_in_traffic?.value ?? result.duration.value) / 60),
    ),
    baselineDurationMinutes: Math.max(1, Math.round(result.duration.value / 60)),
    source: "google_distance_matrix",
  };
}

async function osrmDistance(route: RouteCoordinates): Promise<DrivingDistance | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${route.fromLng},${route.fromLat};${route.toLng},${route.toLat}` +
    "?overview=false&alternatives=false";
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "SentraJetPremium/1.0" },
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    code?: string;
    routes?: Array<{ distance?: number; duration?: number }>;
  };
  const result = payload.routes?.[0];
  if (payload.code !== "Ok" || !result?.distance) return null;

  return {
    distanceKm: ceilDistanceKm(result.distance / 1000),
    durationMinutes: Math.max(1, Math.round((result.duration ?? 0) / 60)),
    baselineDurationMinutes: Math.max(1, Math.round((result.duration ?? 0) / 60)),
    source: "osrm",
  };
}

export async function getDrivingDistance(
  route: RouteCoordinates
): Promise<DrivingDistance | null> {
  if (!validCoordinates(route)) return null;
  return (await googleDistance(route)) ?? (await osrmDistance(route));
}
