export type RoutablePlace = {
  address?: string;
  label?: string;
  lat?: number;
  lng?: number;
};

const AIBD = { lat: 14.6708, lng: -17.0726 };
const AIBD_TERMS = /\b(aibd|blaise[\s-]?diagne|aéroport[^,]*diass|aeroport[^,]*diass)\b/i;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6_371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isAibdPlace(place: RoutablePlace | null | undefined): boolean {
  if (!place) return false;
  const text = `${place.label ?? ""} ${place.address ?? ""}`.trim();
  if (AIBD_TERMS.test(text)) return true;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false;
  return distanceKm(AIBD, { lat: Number(place.lat), lng: Number(place.lng) }) <= 7;
}

function appendPlace(query: URLSearchParams, prefix: "pickup" | "dropoff", place: RoutablePlace | null | undefined) {
  if (!place?.address || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
  query.set(prefix, place.address);
  query.set(`${prefix}Lat`, String(place.lat));
  query.set(`${prefix}Lng`, String(place.lng));
}

export function airportRouteWithPlaces(
  pickup: RoutablePlace | null | undefined,
  dropoff?: RoutablePlace | null,
): string {
  const query = new URLSearchParams();
  appendPlace(query, "pickup", pickup);
  appendPlace(query, "dropoff", dropoff);
  return `/taxi-aeroport${query.size ? `?${query.toString()}` : ""}`;
}

export function airportRouteWithPickup(place: RoutablePlace | null | undefined): string {
  return airportRouteWithPlaces(place);
}
