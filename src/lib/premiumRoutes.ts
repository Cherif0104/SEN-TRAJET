import { supabase } from "@/lib/supabase";

/**
 * Ligne régionale SentraJet Premium — catalogue de découverte (page `/destinations`). Chaque
 * trajet reste une réservation classique via `/reserver` (pas de système de sièges/horaires
 * figés comme Allo Dakar) : le prix affiché est recalculé en direct par `computeSentrajetPrice`
 * à partir de `distance_km`, jamais stocké en dur.
 */
export type PremiumRegionalRoute = {
  id: string;
  destination_city: string;
  region: string | null;
  distance_km: number;
  duration_minutes: number | null;
  suggested_schedule: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
};

const SELECT_COLUMNS =
  "id, destination_city, region, distance_km, duration_minutes, suggested_schedule, description, is_active, display_order";

export async function listPublicPremiumRoutes(): Promise<PremiumRegionalRoute[]> {
  const { data, error } = await supabase
    .from("premium_regional_routes")
    .select(SELECT_COLUMNS)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PremiumRegionalRoute[];
}

export async function listManagedPremiumRoutes(): Promise<PremiumRegionalRoute[]> {
  const { data, error } = await supabase
    .from("premium_regional_routes")
    .select(SELECT_COLUMNS)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PremiumRegionalRoute[];
}

export type ManagedPremiumRouteInput = Omit<PremiumRegionalRoute, "id">;

export async function createPremiumRoute(
  input: ManagedPremiumRouteInput
): Promise<PremiumRegionalRoute> {
  const { data, error } = await supabase
    .from("premium_regional_routes")
    .insert(input)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return data as PremiumRegionalRoute;
}

export async function updatePremiumRoute(
  id: string,
  input: Partial<ManagedPremiumRouteInput>
): Promise<PremiumRegionalRoute> {
  const { data, error } = await supabase
    .from("premium_regional_routes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return data as PremiumRegionalRoute;
}

export async function deletePremiumRoute(id: string): Promise<void> {
  const { error } = await supabase.from("premium_regional_routes").delete().eq("id", id);
  if (error) throw error;
}

/** Regroupe les lignes par région (ordre d'apparition = ordre de display_order). */
export function groupRoutesByRegion(
  routes: PremiumRegionalRoute[]
): Array<{ region: string; routes: PremiumRegionalRoute[] }> {
  const groups = new Map<string, PremiumRegionalRoute[]>();
  for (const route of routes) {
    const key = route.region?.trim() || "Autres destinations";
    const list = groups.get(key) ?? [];
    list.push(route);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([region, list]) => ({ region, routes: list }));
}
