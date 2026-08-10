import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

export type PricingSegment = "client" | "partner";

export type SentrajetTariff = {
  id?: string;
  segment: PricingSegment;
  rule_key: string;
  label: string;
  amount_fcfa: number;
  unit: "forfait" | "per_km";
  is_active?: boolean;
};

/** Services exposés au client (plus de marketplace). */
export type ServiceType =
  | "transfert_aibd"
  | "aibd_retour"
  | "interurbain"
  | "mise_a_disposition";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  transfert_aibd: "Transfert aéroport (AIBD)",
  aibd_retour: "Récupération AIBD + retour",
  interurbain: "Voyage interurbain",
  mise_a_disposition: "Mise à disposition",
};

const FALLBACK_TARIFFS: SentrajetTariff[] = [
  { segment: "client", rule_key: "aibd_1_2", label: "AIBD 1–2 passagers", amount_fcfa: 25000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_3_5", label: "AIBD 3–5 passagers", amount_fcfa: 30000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_6_8", label: "AIBD 6–8 passagers", amount_fcfa: 40000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_9_11", label: "AIBD 9–11 passagers", amount_fcfa: 50000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_retour_1_3", label: "AIBD + retour 1–3", amount_fcfa: 35000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_retour_4_5", label: "AIBD + retour 4–5", amount_fcfa: 40000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_retour_6_8", label: "AIBD + retour 6–8", amount_fcfa: 50000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_retour_9_11", label: "AIBD + retour 9–11", amount_fcfa: 60000, unit: "forfait" },
  { segment: "client", rule_key: "interurbain_km", label: "Interurbain / km", amount_fcfa: 850, unit: "per_km" },
  { segment: "client", rule_key: "interurbain_min", label: "Minimum interurbain", amount_fcfa: 30000, unit: "forfait" },
  { segment: "client", rule_key: "mad_morning", label: "MAD matinée ≤100 km", amount_fcfa: 50000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_1_2", label: "AIBD 1–2 passagers", amount_fcfa: 20000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_3_5", label: "AIBD 3–5 passagers", amount_fcfa: 25000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_6_8", label: "AIBD 6–8 passagers", amount_fcfa: 30000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_9_11", label: "AIBD 9–11 passagers", amount_fcfa: 40000, unit: "forfait" },
  { segment: "partner", rule_key: "interurbain_km", label: "Interurbain / km", amount_fcfa: 700, unit: "per_km" },
  { segment: "partner", rule_key: "interurbain_min", label: "Minimum interurbain", amount_fcfa: 30000, unit: "forfait" },
  { segment: "partner", rule_key: "mad_morning", label: "MAD matinée ≤100 km", amount_fcfa: 50000, unit: "forfait" },
];

function aibdKey(passengers: number): string {
  if (passengers <= 2) return "aibd_1_2";
  if (passengers <= 5) return "aibd_3_5";
  if (passengers <= 8) return "aibd_6_8";
  return "aibd_9_11";
}

function aibdRetourKey(passengers: number): string {
  if (passengers <= 3) return "aibd_retour_1_3";
  if (passengers <= 5) return "aibd_retour_4_5";
  if (passengers <= 8) return "aibd_retour_6_8";
  return "aibd_retour_9_11";
}

export function vehiclesNeededForGroup(passengers: number, seatsPerVehicle = 11): number {
  return Math.max(1, Math.ceil(Math.max(1, passengers) / Math.max(1, seatsPerVehicle)));
}

export async function getSentrajetTariffs(segment?: PricingSegment): Promise<SentrajetTariff[]> {
  try {
    let query = supabase.from("sentrajet_tariffs").select("*").eq("is_active", true);
    if (segment) query = query.eq("segment", segment);
    const { data, error } = await query.order("rule_key");
    if (error || !data?.length) {
      return segment ? FALLBACK_TARIFFS.filter((t) => t.segment === segment) : FALLBACK_TARIFFS;
    }
    return data as SentrajetTariff[];
  } catch {
    return segment ? FALLBACK_TARIFFS.filter((t) => t.segment === segment) : FALLBACK_TARIFFS;
  }
}

export type PriceQuote = {
  amountFcfa: number;
  amountBeforeDiscountFcfa: number;
  discountPercent: number;
  discountFcfa: number;
  label: string;
  ruleKey: string;
  surDevis: boolean;
  vehiclesNeeded: number;
};

export function computeSentrajetPrice(params: {
  segment: PricingSegment;
  serviceType: ServiceType;
  passengers: number;
  distanceKm?: number | null;
  isRoundTrip?: boolean;
  seatsPerVehicle?: number;
  tariffs?: SentrajetTariff[];
  interurbainMinFcfa?: number;
  madMorningFcfa?: number;
  madIncludedKm?: number;
  /** Remise compte : uniquement segment client + utilisateur connecté */
  applyAccountDiscount?: boolean;
  accountDiscountPercent?: number;
}): PriceQuote {
  const tariffs = (params.tariffs ?? FALLBACK_TARIFFS).filter((t) => t.segment === params.segment);
  const byKey = (key: string) => tariffs.find((t) => t.rule_key === key);
  const vehiclesNeeded = vehiclesNeededForGroup(params.passengers, params.seatsPerVehicle ?? 11);
  const kmRateDefault = params.segment === "partner" ? 700 : 850;

  let amountBeforeDiscountFcfa = 0;
  let label = "Sur devis";
  let ruleKey = "devis";
  let surDevis = true;

  if (params.serviceType === "transfert_aibd") {
    const key = aibdKey(Math.max(1, params.passengers));
    const rule = byKey(key);
    amountBeforeDiscountFcfa = rule?.amount_fcfa ?? 25000;
    label = rule?.label ?? "Transfert AIBD";
    ruleKey = key;
    surDevis = false;
  } else if (params.serviceType === "aibd_retour") {
    const key = aibdRetourKey(Math.max(1, params.passengers));
    const rule = byKey(key);
    amountBeforeDiscountFcfa = rule?.amount_fcfa ?? 35000;
    label = rule?.label ?? "AIBD + retour";
    ruleKey = key;
    surDevis = false;
  } else if (params.serviceType === "interurbain") {
    const oneWayKm = Number(params.distanceKm ?? 0);
    const km = params.isRoundTrip ? oneWayKm * 2 : oneWayKm;
    const rate = byKey("interurbain_km")?.amount_fcfa ?? kmRateDefault;
    const minFcfa = params.interurbainMinFcfa ?? byKey("interurbain_min")?.amount_fcfa ?? 30000;
    if (!oneWayKm || oneWayKm <= 0) {
      return {
        amountFcfa: 0,
        amountBeforeDiscountFcfa: 0,
        discountPercent: 0,
        discountFcfa: 0,
        label: "Indiquez la distance pour estimer le prix",
        ruleKey: "interurbain_km",
        surDevis: true,
        vehiclesNeeded,
      };
    }
    const raw = roundFcfa(rate * km);
    amountBeforeDiscountFcfa = Math.max(minFcfa, raw);
    label = `${rate.toLocaleString("fr-FR")} F/km × ${km} km${params.isRoundTrip ? " (AR)" : ""}${
      amountBeforeDiscountFcfa > raw ? " · minimum appliqué" : ""
    }`;
    ruleKey = "interurbain_km";
    surDevis = false;
  } else if (params.serviceType === "mise_a_disposition") {
    const madBase = params.madMorningFcfa ?? byKey("mad_morning")?.amount_fcfa ?? 50000;
    const includedKm = params.madIncludedKm ?? 100;
    const rate = byKey("interurbain_km")?.amount_fcfa ?? kmRateDefault;
    const km = Number(params.distanceKm ?? 0);
    if (!km || km <= 0) {
      amountBeforeDiscountFcfa = madBase;
      label = `Matinée ${madBase.toLocaleString("fr-FR")} F (jusqu’à ${includedKm} km)`;
      ruleKey = "mad_morning";
      surDevis = true;
    } else if (km <= includedKm) {
      amountBeforeDiscountFcfa = madBase;
      label = `Matinée ${madBase.toLocaleString("fr-FR")} F · ${km} km inclus (≤ ${includedKm} km)`;
      ruleKey = "mad_morning";
      surDevis = false;
    } else {
      const extra = km - includedKm;
      amountBeforeDiscountFcfa = roundFcfa(madBase + extra * rate);
      label = `Matinée ${madBase.toLocaleString("fr-FR")} F + ${extra} km × ${rate.toLocaleString("fr-FR")} F`;
      ruleKey = "mad_morning";
      surDevis = false;
    }
  }

  const discountPercent =
    params.segment === "client" && params.applyAccountDiscount
      ? Math.max(0, params.accountDiscountPercent ?? 10)
      : 0;
  const discountFcfa = roundFcfa((amountBeforeDiscountFcfa * discountPercent) / 100);
  const amountFcfa = Math.max(0, amountBeforeDiscountFcfa - discountFcfa);

  return {
    amountFcfa,
    amountBeforeDiscountFcfa,
    discountPercent,
    discountFcfa,
    label:
      discountPercent > 0
        ? `${label} · −${discountPercent}% compte`
        : label,
    ruleKey,
    surDevis,
    vehiclesNeeded: params.serviceType === "interurbain" && params.passengers > 11 ? vehiclesNeeded : 1,
  };
}

export async function computeSentrajetPriceAsync(params: {
  segment: PricingSegment;
  serviceType: ServiceType;
  passengers: number;
  distanceKm?: number | null;
  isRoundTrip?: boolean;
  applyAccountDiscount?: boolean;
}): Promise<PriceQuote> {
  const [tariffs, rules] = await Promise.all([
    getSentrajetTariffs(params.segment),
    listBusinessRules("pricing"),
  ]);
  return computeSentrajetPrice({
    ...params,
    tariffs,
    interurbainMinFcfa: ruleNumber(rules, "pricing", "interurbain_min_fcfa", 30000),
    madMorningFcfa: ruleNumber(rules, "pricing", "mad_morning_fcfa", 50000),
    madIncludedKm: ruleNumber(rules, "pricing", "mad_included_km", 100),
    accountDiscountPercent: ruleNumber(rules, "pricing", "account_discount_percent", 10),
  });
}

export function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
