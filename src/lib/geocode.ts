/**
 * Reverse geocoding : coordonnées → nom de lieu (ville / commune).
 * Utilise l'API Google Geocoding si NEXT_PUBLIC_GOOGLE_MAPS_API_KEY est défini.
 */
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!API_KEY || !lat || !lng) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=fr`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const comp = data.results[0].address_components as Array<{ long_name: string; types: string[] }>;
    const locality = comp.find((c) => c.types.includes("locality"))?.long_name;
    const admin2 = comp.find((c) => c.types.includes("administrative_area_level_2"))?.long_name;
    const admin1 = comp.find((c) => c.types.includes("administrative_area_level_1"))?.long_name;
    return locality || admin2 || admin1 || data.results[0].formatted_address || null;
  } catch {
    return null;
  }
}
