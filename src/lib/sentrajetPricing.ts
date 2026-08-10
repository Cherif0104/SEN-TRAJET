import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";

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

export type ServiceType =
  | "transfert_aibd"
  | "interurbain"
  | "mise_a_disposition"
  | "groupe"
  | "professionnel";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  transfert_aibd: "Transfert aéroport (AIBD)",
  interurbain: "Trajet interurbain",
  mise_a_disposition: "Mise à disposition",
  groupe: "Groupes & événements",
  professionnel: "Service professionnel",
};

const FALLBACK_TARIFFS: SentrajetTariff[] = [
  { segment: "client", rule_key: "aibd_1_2", label: "AIBD 1–2 passagers", amount_fcfa: 25000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_3_5", label: "AIBD 3–5 passagers", amount_fcfa: 30000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_6_8", label: "AIBD 6–8 passagers", amount_fcfa: 40000, unit: "forfait" },
  { segment: "client", rule_key: "aibd_9_11", label: "AIBD 9–11 passagers", amount_fcfa: 50000, unit: "forfait" },
  { segment: "client", rule_key: "interurbain_km", label: "Interurbain > 50 km", amount_fcfa: 850, unit: "per_km" },
  { segment: "partner", rule_key: "aibd_1_2", label: "AIBD 1–2 passagers", amount_fcfa: 20000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_3_5", label: "AIBD 3–5 passagers", amount_fcfa: 25000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_6_8", label: "AIBD 6–8 passagers", amount_fcfa: 30000, unit: "forfait" },
  { segment: "partner", rule_key: "aibd_9_11", label: "AIBD 9–11 passagers", amount_fcfa: 40000, unit: "forfait" },
  { segment: "partner", rule_key: "interurbain_km", label: "Interurbain > 50 km", amount_fcfa: 700, unit: "per_km" },
  { segment: "partner", rule_key: "mise_disposition_base", label: "Mise à disposition (base)", amount_fcfa: 25000, unit: "forfait" },
];

function aibdKey(passengers: number): string {
  if (passengers <= 2) return "aibd_1_2";
  if (passengers <= 5) return "aibd_3_5";
  if (passengers <= 8) return "aibd_6_8";
  return "aibd_9_11";
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

export function computeSentrajetPrice(params: {
  segment: PricingSegment;
  serviceType: ServiceType;
  passengers: number;
  distanceKm?: number | null;
  tariffs?: SentrajetTariff[];
}): { amountFcfa: number; label: string; ruleKey: string; surDevis: boolean } {
  const tariffs = (params.tariffs ?? FALLBACK_TARIFFS).filter((t) => t.segment === params.segment);
  const byKey = (key: string) => tariffs.find((t) => t.rule_key === key);

  if (params.serviceType === "transfert_aibd") {
    const key = aibdKey(Math.max(1, params.passengers));
    const rule = byKey(key);
    return {
      amountFcfa: rule?.amount_fcfa ?? 25000,
      label: rule?.label ?? "Transfert AIBD",
      ruleKey: key,
      surDevis: false,
    };
  }

  if (params.serviceType === "interurbain") {
    const km = Number(params.distanceKm ?? 0);
    const rule = byKey("interurbain_km");
    const rate = rule?.amount_fcfa ?? (params.segment === "partner" ? 700 : 850);
    if (!km || km <= 0) {
      return { amountFcfa: 0, label: "Interurbain (distance requise)", ruleKey: "interurbain_km", surDevis: true };
    }
    return {
      amountFcfa: roundFcfa(rate * km),
      label: `${rate.toLocaleString("fr-FR")} FCFA/km × ${km} km`,
      ruleKey: "interurbain_km",
      surDevis: false,
    };
  }

  if (params.serviceType === "mise_a_disposition" && params.segment === "partner") {
    const base = byKey("mise_disposition_base")?.amount_fcfa ?? 25000;
    const rate = byKey("interurbain_km")?.amount_fcfa ?? 700;
    const km = Number(params.distanceKm ?? 0);
    if (km > 0) {
      return {
        amountFcfa: roundFcfa(base + rate * km),
        label: `Base ${base.toLocaleString("fr-FR")} + ${rate}/km`,
        ruleKey: "mise_disposition_base",
        surDevis: false,
      };
    }
    return {
      amountFcfa: base,
      label: "Mise à disposition (base, km en sus)",
      ruleKey: "mise_disposition_base",
      surDevis: true,
    };
  }

  return {
    amountFcfa: 0,
    label: "Sur devis",
    ruleKey: "devis",
    surDevis: true,
  };
}

export function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
