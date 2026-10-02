import { supabase } from "@/lib/supabase";

/**
 * Véhicule de la galerie publique — uniquement les champs vitrine (jamais plaque d'immatriculation,
 * chauffeur affecté ou notes internes : ces champs restent réservés au back-office).
 */
export type PublicCatalogVehicle = {
  id: string;
  slug: string | null;
  brand: string;
  model: string;
  category: string | null;
  seats: number | null;
  year: number | null;
  color: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  tagline: string | null;
  luggage_capacity: string | null;
  price_reference: string | null;
  ideal_for: string | null;
  availability: string | null;
  chauffeur_mode: string | null;
  is_verified: boolean;
  featured_on_home: boolean;
  status: string;
};

const CATALOG_COLUMNS =
  "id, slug, brand, model, category, seats, year, color, photo_url, photo_urls, tagline, luggage_capacity, price_reference, ideal_for, availability, chauffeur_mode, is_verified, featured_on_home, status";

/** Statuts qui ne doivent jamais apparaître dans la vitrine publique (indisponibilité durable). */
const HIDDEN_STATUSES = new Set(["maintenance", "inactive", "retired", "out_of_service", "hors_service"]);

export async function listPublicVehicleCatalog(): Promise<PublicCatalogVehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(CATALOG_COLUMNS)
    .order("featured_on_home", { ascending: false })
    .order("brand", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as PublicCatalogVehicle[]).filter(
    (vehicle) => !HIDDEN_STATUSES.has((vehicle.status || "").trim().toLowerCase())
  );
}

export async function getPublicVehicleById(id: string): Promise<PublicCatalogVehicle | null> {
  const { data, error } = await supabase.from("vehicles").select(CATALOG_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const vehicle = data as PublicCatalogVehicle;
  return HIDDEN_STATUSES.has((vehicle.status || "").trim().toLowerCase()) ? null : vehicle;
}

/** Toutes les photos d'un véhicule, dédupliquées, photo principale en premier. */
export function vehiclePhotos(vehicle: PublicCatalogVehicle): string[] {
  const list = [vehicle.photo_url, ...(vehicle.photo_urls ?? [])].filter(
    (url): url is string => Boolean(url)
  );
  return Array.from(new Set(list));
}

/** Regroupe les catégories libres (texte admin) en évitant les doublons de casse (ex. "vip"/"VIP"). */
export function distinctCategories(vehicles: PublicCatalogVehicle[]): string[] {
  const seen = new Map<string, string>();
  for (const vehicle of vehicles) {
    const raw = (vehicle.category || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!seen.has(key)) seen.set(key, raw);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
}
