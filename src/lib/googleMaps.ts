/**
 * Helpers Google Maps côté serveur (Places Autocomplete + Distance Matrix).
 * Clés : GOOGLE_MAPS_SERVER_KEY | GOOGLE_MAPS_API_KEY | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 */

export type AutocompletePrediction = {
  placeId?: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
};

function googleKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

export function hasGoogleMapsKey(): boolean {
  return Boolean(googleKey());
}

export async function googlePlacesAutocomplete(query: string): Promise<AutocompletePrediction[]> {
  const key = googleKey();
  if (!key || query.trim().length < 2) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query.trim());
  url.searchParams.set("language", "fr");
  url.searchParams.set("components", "country:sn");
  // Bias Dakar / Sénégal
  url.searchParams.set("location", "14.7167,-17.4677");
  url.searchParams.set("radius", "250000");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    status?: string;
    predictions?: Array<{
      place_id?: string;
      description?: string;
      structured_formatting?: { main_text?: string; secondary_text?: string };
    }>;
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
  return (data.predictions || [])
    .filter((p) => p.place_id && p.description)
    .map((p) => ({
      placeId: p.place_id!,
      description: p.description!,
      mainText: p.structured_formatting?.main_text || p.description!,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));
}
