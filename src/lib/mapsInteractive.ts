import { senegalCities } from "@/data/senegalLocations";

export type LocationSuggestion = {
  label: string;
  source: "local";
};

export function suggestSenegalLocations(query: string, limit = 8): LocationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return senegalCities
    .filter((city) => city.toLowerCase().includes(q))
    .slice(0, Math.max(1, limit))
    .map((city) => ({ label: city, source: "local" as const }));
}

