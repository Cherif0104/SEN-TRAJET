import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import { ceilDistanceKm } from "@/lib/routeDistances";
import { buildDefaultCatalog, DEFAULT_PUBLIC_KM_BANDS } from "@/lib/engines/tariffDefaults";
import { computeTariffQuote, publicKmRateFromCatalog, type TariffEngineResult, type TariffFeeLine } from "@/lib/engines/tariffEngine";
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

/**
 * Catégories de véhicules avec tarif "à partir de" — remplace le moteur générique pour les
 * transferts aéroport, sur demande explicite (choix de catégorie). Forfait plat jusqu'à
 * `flatRateMaxKm` (Dakar-Plateau ↔ AIBD ≈ 51 km routiers réels — cf. calcul OSRM — largement
 * couvert par les 100 km inclus par défaut), puis facturation au km au-delà.
 */
export type VehicleCategory = "berline" | "suv" | "van";

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  berline: "Berline",
  suv: "SUV",
  van: "Van / Minibus",
};

export const VEHICLE_CATEGORY_SEATS: Record<VehicleCategory, number> = {
  berline: 4,
  suv: 5,
  van: 10,
};

export type VehicleCategoryRates = Record<VehicleCategory, { baseFcfa: number; extraKmFcfa: number }>;

/** Berline à partir de 25 000, SUV à partir de 30 000 (fourchette 30-35 000 selon modèle), Van à
 * partir de 45 000 — forfait couvrant jusqu'à `DEFAULT_FLAT_RATE_MAX_KM` (100 km, ex. Dakar-Plateau
 * → AIBD ≈ 51 km réels). Modifiable sans code via business_rules (catégorie "vehicle_pricing"). */
export const DEFAULT_VEHICLE_CATEGORY_RATES: VehicleCategoryRates = {
  berline: { baseFcfa: 25_000, extraKmFcfa: 500 },
  suv: { baseFcfa: 30_000, extraKmFcfa: 600 },
  van: { baseFcfa: 45_000, extraKmFcfa: 700 },
};

export const DEFAULT_FLAT_RATE_MAX_KM = 100;

/**
 * Services pour lesquels une catégorie de véhicule peut être choisie et pilote le prix.
 * Les mises à disposition suivent un modèle différent (zone Dakar/hors Dakar + forfait 8h,
 * voir `tariffDefaults.ts`) — volontairement exclues d'ici pour ne pas les faire basculer sur un
 * forfait par catégorie de véhicule.
 */
export const VEHICLE_CATEGORY_PRICED_SERVICES: ServiceType[] = ["transfert_aibd", "aibd_retour"];

function buildVehicleCategoryEngineResult(params: {
  priceLayer: "public" | "partner";
  vehicleCategory: VehicleCategory;
  oneWayKm: number;
  isRoundTrip: boolean;
  rates: VehicleCategoryRates;
  flatRateMaxKm: number;
}): TariffEngineResult {
  const { vehicleCategory, oneWayKm, isRoundTrip, rates, flatRateMaxKm } = params;
  const { baseFcfa, extraKmFcfa } = rates[vehicleCategory];
  const legs = isRoundTrip ? 2 : 1;
  const totalKm = oneWayKm * legs;
  const thresholdKm = flatRateMaxKm * legs;
  const baseTotal = baseFcfa * legs;
  const categoryLabel = VEHICLE_CATEGORY_LABELS[vehicleCategory];
  const breakdown: string[] = [];

  let transportFcfa = baseTotal;
  let formulaApplied = `Forfait ${categoryLabel} à partir de ${baseFcfa.toLocaleString("fr-FR")} FCFA${
    isRoundTrip ? " par trajet (aller-retour)" : ""
  } — jusqu'à ${flatRateMaxKm} km inclus`;

  if (totalKm > thresholdKm) {
    const extraKm = roundFcfa(totalKm - thresholdKm);
    const extraAmount = roundFcfa(extraKm * extraKmFcfa);
    transportFcfa = baseTotal + extraAmount;
    formulaApplied = `Forfait ${categoryLabel} ${baseFcfa.toLocaleString("fr-FR")} FCFA (${flatRateMaxKm} km inclus) + ${extraKm} km × ${extraKmFcfa.toLocaleString(
      "fr-FR"
    )} FCFA au-delà`;
    breakdown.push(`Distance ${totalKm} km > ${thresholdKm} km inclus — facturation au km au-delà du seuil`);
  }

  return {
    transportFcfa,
    totalFcfa: transportFcfa,
    ratePerKm: extraKmFcfa,
    outboundKm: oneWayKm,
    returnKm: isRoundTrip ? oneWayKm : 0,
    billableKm: totalKm,
    formulaApplied,
    ruleKey: `vehicle_category_${vehicleCategory}`,
    label: `${categoryLabel} · à partir de ${baseFcfa.toLocaleString("fr-FR")} FCFA`,
    tariffVersionCode: "VEHICLE_CATEGORY_V1",
    charteVersion: "1.0",
    vehicleModel: categoryLabel,
    surDevis: false,
    estimatif: false,
    requiresManualValidation: false,
    feeLines: [],
    breakdown,
    internalOnly: { priceLayer: params.priceLayer },
  };
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
  /** Si renseignée pour un service transfert aéroport / MAD, pilote le prix (voir plus haut). */
  vehicleCategory?: VehicleCategory | null;
  vehicleCategoryRates?: VehicleCategoryRates;
  flatRateMaxKm?: number;
}): PriceQuote {
  const passengers = Math.max(1, params.passengers);
  const luggage = Math.max(0, params.luggage ?? 0);
  const tripMode = params.tripMode ?? "aller_simple";
  const oneWayKm = ceilDistanceKm(Number(params.distanceKm ?? 0));
  const band = capacityBand(passengers);
  const vehicleSuggestion = suggestedVehicleClass(passengers, luggage);
  const vehiclesNeeded = vehiclesNeededForGroup(passengers, 10);
  const priceLayer = params.segment === "partner" ? "partner" : "public";

  const usesVehicleCategoryPricing =
    Boolean(params.vehicleCategory) && VEHICLE_CATEGORY_PRICED_SERVICES.includes(params.serviceType);

  const engine = usesVehicleCategoryPricing
    ? buildVehicleCategoryEngineResult({
        priceLayer,
        vehicleCategory: params.vehicleCategory as VehicleCategory,
        oneWayKm,
        isRoundTrip: tripMode === "aller_retour",
        rates: params.vehicleCategoryRates ?? DEFAULT_VEHICLE_CATEGORY_RATES,
        flatRateMaxKm: params.flatRateMaxKm ?? DEFAULT_FLAT_RATE_MAX_KM,
      })
    : computeTariffQuote({
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
  vehicleCategory?: VehicleCategory | null;
}): Promise<PriceQuote> {
  const priceLayer = params.segment === "partner" ? "partner" : "public";
  const [rules, pricingRules, catalog] = await Promise.all([
    listBusinessRules("pricing").catch(() => []),
    listBusinessRules("vehicle_pricing").catch(() => []),
    loadTariffCatalog(priceLayer),
  ]);
  return computeSentrajetPrice({
    ...params,
    catalog,
    accountDiscountPercent: ruleNumber(rules, "pricing", "account_discount_percent", 10),
    longDistanceFromKm: ruleNumber(rules, "pricing", "long_distance_from_km", 250),
    vehicleCategoryRates: vehicleCategoryRatesFromRules(pricingRules),
    flatRateMaxKm: ruleNumber(pricingRules, "vehicle_pricing", "flat_rate_max_km", DEFAULT_FLAT_RATE_MAX_KM),
  });
}

/** Construit les tarifs par catégorie à partir des business_rules "vehicle_pricing" (avec repli
 * sur les valeurs par défaut si une règle n'est pas encore configurée en base). */
export function vehicleCategoryRatesFromRules(
  rules: Array<{ category: string; rule_key: string; value_json: unknown }>
): VehicleCategoryRates {
  const num = (key: string, fallback: number): number => {
    const rule = rules.find((r) => r.category === "vehicle_pricing" && r.rule_key === key);
    const n = rule ? Number(rule.value_json) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    berline: {
      baseFcfa: num("berline_base_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.berline.baseFcfa),
      extraKmFcfa: num("berline_extra_km_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.berline.extraKmFcfa),
    },
    suv: {
      baseFcfa: num("suv_base_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.suv.baseFcfa),
      extraKmFcfa: num("suv_extra_km_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.suv.extraKmFcfa),
    },
    van: {
      baseFcfa: num("van_base_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.van.baseFcfa),
      extraKmFcfa: num("van_extra_km_fcfa", DEFAULT_VEHICLE_CATEGORY_RATES.van.extraKmFcfa),
    },
  };
}

/** Ajoute la catégorie de véhicule choisie (transfert aéroport) dans les notes de réservation —
 * évite une colonne dédiée tant que le besoin de filtrer/dispatcher par catégorie n'est pas
 * confirmé, tout en gardant l'information visible pour les Ops. */
export function buildNotesWithVehicleCategory(
  notes: string,
  vehicleCategory: VehicleCategory | null | undefined
): string | null {
  const trimmed = notes.trim();
  if (!vehicleCategory) return trimmed || null;
  const line = `Catégorie véhicule choisie : ${VEHICLE_CATEGORY_LABELS[vehicleCategory]}`;
  return trimmed ? `${trimmed}\n${line}` : line;
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
  unit: "forfait" | "per_km" | "sur_devis";
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
      unit:
        r.pricingMode === "manual"
          ? "sur_devis"
          : r.pricingMode === "per_km"
            ? "per_km"
            : "forfait",
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
