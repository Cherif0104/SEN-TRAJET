import { supabase } from "@/lib/supabase";

export type RoutePriceRule = {
  from_city: string;
  to_city: string;
  price_fcfa: number;
  vehicle_category?: string | null;
};

export type PartnerPricingContract = {
  id: string;
  partner_id: string;
  name: string;
  discount_percent: number;
  route_prices: RoutePriceRule[];
  currency: string;
  notes: string | null;
  is_active: boolean;
  active_from: string;
  active_to: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeRoutePrices(raw: unknown): RoutePriceRule[] {
  if (!Array.isArray(raw)) return [];
  const rules: RoutePriceRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fromCity = String(row.from_city ?? "").trim();
    const toCity = String(row.to_city ?? "").trim();
    const price = Number(row.price_fcfa);
    if (!fromCity || !toCity || !Number.isFinite(price) || price < 0) continue;
    rules.push({
      from_city: fromCity,
      to_city: toCity,
      price_fcfa: Math.round(price),
      vehicle_category: row.vehicle_category ? String(row.vehicle_category) : null,
    });
  }
  return rules;
}

function mapContract(row: Record<string, unknown>): PartnerPricingContract {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    name: String(row.name),
    discount_percent: Number(row.discount_percent ?? 0),
    route_prices: normalizeRoutePrices(row.route_prices),
    currency: String(row.currency ?? "XOF"),
    notes: (row.notes as string | null) ?? null,
    is_active: Boolean(row.is_active),
    active_from: String(row.active_from),
    active_to: (row.active_to as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Contrat actif le plus récent pour un partenaire. */
export async function getActivePartnerContract(
  partnerId: string
): Promise<PartnerPricingContract | null> {
  const { data, error } = await supabase
    .from("partner_pricing_contracts")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("is_active", true)
    .order("active_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapContract(data as Record<string, unknown>);
}

export async function listPartnerContracts(
  partnerId: string
): Promise<PartnerPricingContract[]> {
  const { data, error } = await supabase
    .from("partner_pricing_contracts")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapContract(row as Record<string, unknown>));
}

/**
 * Calcule le prix facturé partenaire :
 * 1) prix fixe corridor si défini
 * 2) sinon prix catalogue × (1 - remise%)
 */
export function computePartnerBilledPrice(params: {
  catalogPriceFcfa: number;
  contract: PartnerPricingContract | null;
  fromCity?: string;
  toCity?: string;
  vehicleCategory?: string | null;
}): number {
  const catalog = Math.max(0, Math.round(params.catalogPriceFcfa));
  if (!params.contract) return catalog;

  const from = (params.fromCity ?? "").trim().toLowerCase();
  const to = (params.toCity ?? "").trim().toLowerCase();
  if (from && to) {
    const match = params.contract.route_prices.find((rule) => {
      const sameRoute =
        rule.from_city.trim().toLowerCase() === from &&
        rule.to_city.trim().toLowerCase() === to;
      if (!sameRoute) return false;
      if (!rule.vehicle_category || !params.vehicleCategory) return true;
      return (
        rule.vehicle_category.trim().toLowerCase() ===
        params.vehicleCategory.trim().toLowerCase()
      );
    });
    if (match) return match.price_fcfa;
  }

  const discount = Math.min(100, Math.max(0, Number(params.contract.discount_percent) || 0));
  return Math.round(catalog * (1 - discount / 100));
}
