import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";
import { vehiclesNeededForGroup, type ServiceType } from "@/lib/sentrajetPricing";

export type PartnerTariffOverride = {
  id: string;
  partner_contract_id: string;
  service_type: string;
  pricing_mode: "forfait" | "per_km";
  base_price_fcfa: number | null;
  price_per_km_fcfa: number | null;
  minimum_price_fcfa: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_FIELDS =
  "id, partner_contract_id, service_type, pricing_mode, base_price_fcfa, price_per_km_fcfa, minimum_price_fcfa, is_active, notes, created_at, updated_at";

export async function listPartnerTariffOverrides(partnerContractId: string): Promise<PartnerTariffOverride[]> {
  const { data, error } = await supabase
    .from("partner_tariff_overrides")
    .select(SELECT_FIELDS)
    .eq("partner_contract_id", partnerContractId)
    .order("service_type");
  if (error) throw error;
  return (data ?? []) as PartnerTariffOverride[];
}

export async function upsertPartnerTariffOverride(input: {
  partnerContractId: string;
  serviceType: string;
  pricingMode: "forfait" | "per_km";
  basePriceFcfa?: number | null;
  pricePerKmFcfa?: number | null;
  minimumPriceFcfa?: number | null;
  notes?: string | null;
}): Promise<PartnerTariffOverride> {
  const { data, error } = await supabase
    .from("partner_tariff_overrides")
    .upsert(
      {
        partner_contract_id: input.partnerContractId,
        service_type: input.serviceType,
        pricing_mode: input.pricingMode,
        base_price_fcfa: input.basePriceFcfa ?? null,
        price_per_km_fcfa: input.pricePerKmFcfa ?? null,
        minimum_price_fcfa: input.minimumPriceFcfa ?? null,
        notes: input.notes ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partner_contract_id,service_type" }
    )
    .select(SELECT_FIELDS)
    .single();
  if (error) throw error;
  return data as PartnerTariffOverride;
}

export async function removePartnerTariffOverride(id: string): Promise<void> {
  const { error } = await supabase.from("partner_tariff_overrides").delete().eq("id", id);
  if (error) throw error;
}

export async function setPartnerTariffOverrideActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("partner_tariff_overrides")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Petit sous-ensemble de PriceQuote suffisant pour remplacer la simulation générique dans BookingForm. */
export type OverrideQuote = {
  amountFcfa: number;
  surDevis: boolean;
  formulaApplied: string;
  label: string;
  distanceKm: number;
  vehiclesNeeded: number;
};

/**
 * Calcule le prix à partir d'un tarif personnalisé partenaire — volontairement simple (pas de
 * bandes km, pas de zones) : un forfait fixe, ou un prix au km avec plancher optionnel.
 */
export function computePartnerOverrideQuote(
  override: PartnerTariffOverride,
  params: { passengers: number; distanceKm: number | null; isRoundTrip: boolean }
): OverrideQuote {
  const oneWayKm = Math.max(0, params.distanceKm ?? 0);
  const totalKm = params.isRoundTrip ? oneWayKm * 2 : oneWayKm;
  const vehiclesNeeded = vehiclesNeededForGroup(Math.max(1, params.passengers), 10);

  let amountFcfa: number;
  let formulaApplied: string;
  if (override.pricing_mode === "forfait") {
    amountFcfa = override.base_price_fcfa ?? 0;
    formulaApplied = "Forfait personnalisé partenaire";
  } else {
    const perKm = override.price_per_km_fcfa ?? 0;
    amountFcfa = roundFcfa(perKm * totalKm);
    formulaApplied = `${perKm.toLocaleString("fr-FR")} FCFA/km personnalisé × ${totalKm} km`;
    if (override.minimum_price_fcfa != null && amountFcfa < override.minimum_price_fcfa) {
      amountFcfa = override.minimum_price_fcfa;
      formulaApplied += ` (plancher ${override.minimum_price_fcfa.toLocaleString("fr-FR")} FCFA)`;
    }
  }

  return {
    amountFcfa: Math.max(0, amountFcfa),
    surDevis: false,
    formulaApplied,
    label: "Tarif personnalisé partenaire",
    distanceKm: oneWayKm,
    vehiclesNeeded,
  };
}

export function findOverrideForService(
  overrides: PartnerTariffOverride[],
  serviceType: ServiceType
): PartnerTariffOverride | null {
  return overrides.find((o) => o.service_type === serviceType && o.is_active) ?? null;
}
