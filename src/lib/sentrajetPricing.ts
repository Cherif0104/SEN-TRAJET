import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import { ceilDistanceKm } from "@/lib/routeDistances";
import { buildDefaultCatalog, DEFAULT_PUBLIC_KM_BANDS } from "@/lib/engines/tariffDefaults";
import { computeTariffQuote, publicKmRateFromCatalog, type TariffFeeLine } from "@/lib/engines/tariffEngine";
import { loadTariffCatalog } from "@/lib/engines/tariffCatalog";

export type PricingSegment = "client" | "partner";

export type TripMode = "aller_simple" | "aller_retour" | "attente" | "retour_differe";

export type ServiceType =
  | "transfert_aibd"
  | "aibd_retour"
  | "interurbain"
  | "mise_a_disposition"
  | "ceremonie"
  | "groupe_evenement"
  | "longue_distance"
  | "autre";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  transfert_aibd: "Transfert aéroport",
  aibd_retour: "Récupération AIBD + retour",
  interurbain: "Trajet / Voyager",
  mise_a_disposition: "Mise à disposition",
  ceremonie: "Cérémonie & sortie",
  groupe_evenement: "Groupe / Événement",
  longue_distance: "Longue distance",
  autre: "Autre demande",
};

export const TRIP_MODE_LABELS: Record<TripMode, string> = {
  aller_simple: "Aller simple",
  aller_retour: "Aller-retour",
  attente: "Avec attente sur place",
  retour_differe: "Retour différé",
};

export type CapacityBand = "1_4" | "5_7" | "8_10" | "over";

export function capacityBand(passengers: number): CapacityBand {
  if (passengers <= 4) return "1_4";
  if (passengers <= 7) return "5_7";
  if (passengers <= 10) return "8_10";
  return "over";
}

export function suggestedVehicleClass(passengers: number, luggage: number): {
  label: string;
  seats: number;
  luggageHint: string;
  alert: string | null;
} {
  const needSeats = Math.max(passengers, 1);
  if (needSeats > 10 || luggage > 12) {
    return {
      label: "Plusieurs véhicules / cotation",
      seats: 10,
      luggageHint: "Capacité dépassée",
      alert: "Effectif ou bagages élevés — cotation SentraJet recommandée.",
    };
  }
  if (needSeats <= 5 && luggage <= 4) {
    return {
      label: "Berline / monospace compact",
      seats: 5,
      luggageHint: "jusqu’à ~4 valises",
      alert: luggage > 4 ? "Bagages nombreux pour un compact." : null,
    };
  }
  if (needSeats <= 8 && luggage <= 8) {
    return {
      label: "Van 7–8 places",
      seats: 8,
      luggageHint: "jusqu’à ~8 valises",
      alert: luggage > 8 ? "Bagages élevés — véhicule plus grand conseillé." : null,
    };
  }
  return {
    label: "Hyundai Starex 10 places",
    seats: 10,
    luggageHint: "jusqu’à ~12 valises",
    alert: null,
  };
}

export function vehiclesNeededForGroup(passengers: number, seatsPerVehicle = 10): number {
  return Math.max(1, Math.ceil(Math.max(1, passengers) / Math.max(1, seatsPerVehicle)));
}

export type PriceQuote = {
  amountFcfa: number;
  amountBeforeDiscountFcfa: number;
  discountPercent: number;
  discountFcfa: number;
  waitingFeeFcfa: number;
  label: string;
  ruleKey: string;
  formulaApplied: string;
  surDevis: boolean;
  estimatif: boolean;
  vehiclesNeeded: number;
  billableKm: number;
  distanceKm: number;
  outboundKm?: number;
  returnKm?: number;
  ratePerKm?: number | null;
  tariffVersionCode?: string;
  feeLines?: TariffFeeLine[];
  requiresManualValidation?: boolean;
  capacityBand: CapacityBand;
  vehicleSuggestion: ReturnType<typeof suggestedVehicleClass>;
  breakdown: string[];
};

/** @deprecated Prefer catalogue DB via tariffEngine — fallback local charte v1. */
export function publicKmRate(passengers: number): number {
  return publicKmRateFromCatalog(passengers, buildDefaultCatalog());
}

export function billableKmForTrip(oneWayKm: number, tripMode: TripMode): number {
  const km = Math.max(0, oneWayKm);
  return tripMode === "aller_retour" ? km * 2 : km;
}

export function computeWaitingFeeFcfa(params: {
  serviceType: ServiceType;
  waitingMinutes: number;
  freeMinutes?: number;
  feePerSliceFcfa?: number;
  sliceMinutes?: number;
}): number {
  if (params.serviceType === "mise_a_disposition") return 0;
  const free = params.freeMinutes ?? 30;
  const slice = params.sliceMinutes ?? 30;
  const fee = params.feePerSliceFcfa ?? 2500;
  const billable = Math.max(0, params.waitingMinutes - free);
  if (billable <= 0) return 0;
  return Math.ceil(billable / slice) * fee;
}

/**
 * Simulation tarifaire.
 * - segment `client` → couche **public** uniquement
 * - segment `partner` → couche **partner** uniquement (jamais affichée en public)
 * Les coûts fournisseur ne passent jamais par cette fonction côté UI.
 */
export function computeSentrajetPrice(params: {
  segment: PricingSegment;
  serviceType: ServiceType;
  passengers: number;
  luggage?: number;
  distanceKm?: number | null;
  tripMode?: TripMode;
  waitingMinutes?: number;
  applyAccountDiscount?: boolean;
  accountDiscountPercent?: number;
  longDistanceFromKm?: number;
  catalog?: ReturnType<typeof buildDefaultCatalog>;
}): PriceQuote {
  const passengers = Math.max(1, params.passengers);
  const luggage = Math.max(0, params.luggage ?? 0);
  const tripMode = params.tripMode ?? "aller_simple";
  const oneWayKm = ceilDistanceKm(Number(params.distanceKm ?? 0));
  const band = capacityBand(passengers);
  const vehicleSuggestion = suggestedVehicleClass(passengers, luggage);
  const vehiclesNeeded = vehiclesNeededForGroup(passengers, 10);
  const priceLayer = params.segment === "partner" ? "partner" : "public";

  const engine = computeTariffQuote({
    priceLayer,
    passengers,
    roadDistanceKm: oneWayKm || null,
    tripMode,
    serviceType: params.serviceType,
    waitingMinutes: params.waitingMinutes,
    catalog: params.catalog ?? buildDefaultCatalog().filter((r) => r.priceLayer === priceLayer),
  });

  let waitingFeeFcfa = 0;
  if (tripMode === "attente" || (params.waitingMinutes ?? 0) > 0) {
    waitingFeeFcfa = computeWaitingFeeFcfa({
      serviceType: params.serviceType,
      waitingMinutes: params.waitingMinutes ?? (tripMode === "attente" ? 60 : 0),
    });
  }

  const amountBeforeDiscountFcfa = roundFcfa(engine.transportFcfa + waitingFeeFcfa);
  const discountPercent =
    params.segment === "client" && params.applyAccountDiscount && !engine.surDevis && amountBeforeDiscountFcfa > 0
      ? Math.max(0, params.accountDiscountPercent ?? 10)
      : 0;
  const discountFcfa = roundFcfa((amountBeforeDiscountFcfa * discountPercent) / 100);
  const amountFcfa = Math.max(0, amountBeforeDiscountFcfa - discountFcfa);

  const breakdown = [...engine.breakdown];
  if (waitingFeeFcfa > 0) {
    breakdown.push(`Attente facturable : ${waitingFeeFcfa.toLocaleString("fr-FR")} FCFA`);
  }
  if (vehicleSuggestion.alert) breakdown.push(vehicleSuggestion.alert);
  if (vehiclesNeeded > 1) breakdown.push(`Environ ${vehiclesNeeded} véhicules nécessaires`);
  if (discountPercent > 0) breakdown.push(`Remise compte −${discountPercent}%`);
  if (engine.requiresManualValidation) {
    breakdown.push("Simulation indicative — validation SentraJet possible avant confirmation");
  }

  // Garde-fou : ne jamais laisser fuiter un libellé partenaire dans une quote client
  if (params.segment === "client" && /partenaire|fournisseur|marge|B2B/i.test(engine.label + engine.formulaApplied)) {
    engine.label = "Tarif SentraJet Premium";
  }

  return {
    amountFcfa,
    amountBeforeDiscountFcfa,
    discountPercent,
    discountFcfa,
    waitingFeeFcfa,
    label: discountPercent > 0 ? `${engine.label} · −${discountPercent}% compte` : engine.label,
    ruleKey: engine.ruleKey,
    formulaApplied: engine.formulaApplied,
    surDevis: engine.surDevis,
    estimatif: engine.estimatif,
    vehiclesNeeded,
    billableKm: engine.billableKm,
    distanceKm: oneWayKm,
    outboundKm: engine.outboundKm,
    returnKm: engine.returnKm,
    ratePerKm: engine.ratePerKm,
    tariffVersionCode: engine.tariffVersionCode,
    feeLines: engine.feeLines,
    requiresManualValidation: engine.requiresManualValidation,
    capacityBand: band,
    vehicleSuggestion,
    breakdown,
  };
}

export async function computeSentrajetPriceAsync(params: {
  segment: PricingSegment;
  serviceType: ServiceType;
  passengers: number;
  luggage?: number;
  distanceKm?: number | null;
  tripMode?: TripMode;
  waitingMinutes?: number;
  applyAccountDiscount?: boolean;
}): Promise<PriceQuote> {
  const priceLayer = params.segment === "partner" ? "partner" : "public";
  const [rules, catalog] = await Promise.all([
    listBusinessRules("pricing").catch(() => []),
    loadTariffCatalog(priceLayer),
  ]);
  return computeSentrajetPrice({
    ...params,
    catalog,
    accountDiscountPercent: ruleNumber(rules, "pricing", "account_discount_percent", 10),
    longDistanceFromKm: ruleNumber(rules, "pricing", "long_distance_from_km", 250),
  });
}

export function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

export type SentrajetTariff = {
  id?: string;
  segment: PricingSegment;
  rule_key: string;
  label: string;
  amount_fcfa: number;
  unit: "forfait" | "per_km";
  is_active?: boolean;
};

/** Lecture des tarifs pour l’espace concerné (partner ≠ public). */
export async function getSentrajetTariffs(segment?: PricingSegment): Promise<SentrajetTariff[]> {
  const layer = segment === "partner" ? "partner" : "public";
  const catalog = await loadTariffCatalog(layer);
  if (catalog.length) {
    return catalog.map((r) => ({
      segment: layer === "partner" ? "partner" : "client",
      rule_key: r.ruleKey,
      label: r.label,
      amount_fcfa: Math.round(Number(r.pricePerKmFcfa ?? r.basePriceFcfa ?? 0)),
      unit: r.pricingMode === "per_km" ? "per_km" : "forfait",
      is_active: true,
    }));
  }

  // Legacy fallback table (segment client only for anon)
  try {
    let query = supabase.from("sentrajet_tariffs").select("*").eq("is_active", true);
    if (segment) query = query.eq("segment", segment);
    const { data, error } = await query.order("rule_key");
    if (error || !data?.length) {
      return DEFAULT_PUBLIC_KM_BANDS.map((b) => ({
        segment: "client" as const,
        rule_key: b.key,
        label: `Public ${b.min}–${b.max} passagers`,
        amount_fcfa: b.rate,
        unit: "per_km" as const,
      }));
    }
    return data as SentrajetTariff[];
  } catch {
    return [];
  }
}
