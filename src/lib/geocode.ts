/**
 * Reverse géocodage : coordonnées → nom de lieu.
 * Appelle la route Next `/api/geocode/reverse` (Google si clé serveur/publique, sinon Nominatim).
 */
import { formatCoordinatesLabel } from "@/lib/geoFormat";

export { formatCoordinatesLabel };

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const res = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
    if (!res.ok) return formatCoordinatesLabel(lat, lng);
    const data = (await res.json()) as { label: string | null; fallback: string | null };
    const text = (data.label || data.fallback || "").trim();
    return text || formatCoordinatesLabel(lat, lng);
  } catch {
    return formatCoordinatesLabel(lat, lng);
  }
}
