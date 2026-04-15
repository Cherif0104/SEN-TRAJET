/**
 * Coordonnées et constantes géographiques — Sénégal
 * Centre par défaut : Dakar
 */

export const SENEGAL_CENTER = { lat: 14.7167, lng: -17.4677 } as const;
export const SENEGAL_DEFAULT_ZOOM = 7;

export const CITIES: Record<string, { lat: number; lng: number }> = {
  Dakar: { lat: 14.7167, lng: -17.4677 },
  Thiès: { lat: 14.7833, lng: -16.9667 },
  "Saint-Louis": { lat: 16.0333, lng: -16.5 },
  Kaolack: { lat: 14.15, lng: -16.0833 },
  Ziguinchor: { lat: 12.5833, lng: -16.2667 },
  Mbour: { lat: 14.4167, lng: -16.9667 },
  Touba: { lat: 14.8667, lng: -15.8833 },
  Rufisque: { lat: 14.7167, lng: -17.2667 },
  Pikine: { lat: 14.75, lng: -17.4 },
};

export function getCityCoords(cityName: string): { lat: number; lng: number } | null {
  const normalized = cityName.trim();
  return CITIES[normalized] ?? null;
}

export function getBoundsFromPoints(
  points: Array<{ lat: number; lng: number }>
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return {
      minLat: SENEGAL_CENTER.lat - 0.1,
      maxLat: SENEGAL_CENTER.lat + 0.1,
      minLng: SENEGAL_CENTER.lng - 0.1,
      maxLng: SENEGAL_CENTER.lng + 0.1,
    };
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const padding = 0.05;
  return {
    minLat: Math.min(...lats) - padding,
    maxLat: Math.max(...lats) + padding,
    minLng: Math.min(...lngs) - padding,
    maxLng: Math.max(...lngs) + padding,
  };
}

export function computeDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
