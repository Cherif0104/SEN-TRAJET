import { ceilDistanceKm } from "@/lib/routeDistances";
import { roundFcfa } from "@/lib/pricingMath";
import {
  buildDefaultCatalog,
  CHARTE_VERSION,
  DEFAULT_PUBLIC_KM_BANDS,
  DEFAULT_PUBLIC_SHORT_TRIP_MIN,
  DEFAULT_ROUNDING_STEP,
  DEFAULT_SHORT_TRIP_KM,
  DEFAULT_VEHICLE,
  type FeePolicy,
  type PriceLayer,
  type TariffRule,
  type TariffZone,
} from "@/lib/engines/tariffDefaults";

export type TariffFeeLine = {
  key: string;
  label: string;
  amountFcfa: number | null;
  status: FeePolicy;
};

export type TariffEngineInput = {
  /** Couche demandée — jamais mélanger public/partenaire/fournisseur. */
  priceLayer: PriceLayer;
  passengers: number;
  /** Distance routière réelle (aller), jamais orthodromie. */
  roadDistanceKm: number | null;
  tripMode: "aller_simple" | "aller_retour" | "attente" | "retour_differe";
  serviceType: string;
  zone?: TariffZone;
  waitingMinutes?: number;
  catalog?: TariffRule[];
  roundingStep?: number;
  shortTripMinFcfa?: number;
  shortTripMaxKm?: number;
};

export type TariffEngineResult = {
  transportFcfa: number;
  totalFcfa: number;
  ratePerKm: number | null;
  outboundKm: number;
  returnKm: number;
  billableKm: number;
  formulaApplied: string;
  ruleKey: string;
  label: string;
  tariffVersionCode: string;
  charteVersion: string;
  vehicleModel: string;
  surDevis: boolean;
  estimatif: boolean;
  requiresManualValidation: boolean;
  feeLines: TariffFeeLine[];
  breakdown: string[];
  /** Jamais renvoyé à l’UI publique. */
  internalOnly?: {
    priceLayer: PriceLayer;
  };
};

function commercialRound(amount: number, step = DEFAULT_ROUNDING_STEP): number {
  if (step <= 1) return roundFcfa(amount);
  return Math.round(amount / step) * step;
}

export function publicKmRateFromCatalog(passengers: number, catalog: TariffRule[]): number {
  const rules = catalog.filter((r) => r.priceLayer === "public" && r.serviceFamily === "trajet" && r.pricingMode === "per_km");
  const hit = rules.find(
    (r) =>
      r.passengersMin != null &&
      r.passengersMax != null &&
      passengers >= r.passengersMin &&
      passengers <= r.passengersMax
  );
  if (hit?.pricePerKmFcfa) return Number(hit.pricePerKmFcfa);
  const fallback = DEFAULT_PUBLIC_KM_BANDS.find((b) => passengers >= b.min && passengers <= b.max);
  return fallback?.rate ?? 0;
}

export function inferZone(params: {
  zone?: TariffZone;
  roadDistanceKm: number;
  pickup?: string;
  dropoff?: string;
}): TariffZone {
  if (params.zone && params.zone !== "any") return params.zone;
  const text = `${params.pickup ?? ""} ${params.dropoff ?? ""}`.toLowerCase();
  const mentionsDakar = text.includes("dakar");
  if (mentionsDakar && params.roadDistanceKm > 0 && params.roadDistanceKm <= 40) return "dakar";
  if (params.roadDistanceKm > 40) return "hors_dakar";
  if (mentionsDakar) return "dakar";
  return "hors_dakar";
}

function policyLines(rule: Pick<TariffRule, "fuelPolicy" | "tollPolicy" | "parkingPolicy" | "ferryPolicy" | "driverPolicy">): TariffFeeLine[] {
  return [
    { key: "carburant", label: "Carburant", amountFcfa: null, status: rule.fuelPolicy },
    { key: "peages", label: "Péages", amountFcfa: null, status: rule.tollPolicy },
    { key: "parking", label: "Parking", amountFcfa: null, status: rule.parkingPolicy },
    { key: "ferry", label: "Ferry", amountFcfa: null, status: rule.ferryPolicy },
    { key: "chauffeur", label: "Chauffeur", amountFcfa: null, status: rule.driverPolicy },
  ];
}

/**
 * Moteur tarifaire structuré — calcule uniquement la couche demandée.
 * Ne mélange jamais public / partenaire / fournisseur.
 */
export function computeTariffQuote(input: TariffEngineInput): TariffEngineResult {
  const catalog = input.catalog?.length ? input.catalog : buildDefaultCatalog();
  const passengers = Math.max(1, input.passengers);
  const oneWayKm = ceilDistanceKm(Number(input.roadDistanceKm ?? 0));
  const isRoundTrip = input.tripMode === "aller_retour";
  const outboundKm = oneWayKm;
  const returnKm = isRoundTrip ? oneWayKm : 0;
  const billableKm = outboundKm + returnKm;
  const zone = input.zone ?? (oneWayKm > 40 ? "hors_dakar" : "dakar");
  const breakdown: string[] = [];
  const roundingStep = input.roundingStep ?? DEFAULT_ROUNDING_STEP;
  const shortMin = input.shortTripMinFcfa ?? DEFAULT_PUBLIC_SHORT_TRIP_MIN;
  const shortMaxKm = input.shortTripMaxKm ?? DEFAULT_SHORT_TRIP_KM;

  if (input.tripMode === "retour_differe") {
    return {
      transportFcfa: 0,
      totalFcfa: 0,
      ratePerKm: null,
      outboundKm,
      returnKm: 0,
      billableKm: outboundKm,
      formulaApplied: "Retour différé — validation manuelle",
      ruleKey: "retour_differe",
      label: "Cotation manuelle",
      tariffVersionCode: `${input.priceLayer.toUpperCase()}_MANUAL`,
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: true,
      estimatif: false,
      requiresManualValidation: true,
      feeLines: [],
      breakdown: ["Retour différé hors grille automatique"],
      internalOnly: { priceLayer: input.priceLayer },
    };
  }

  if (passengers > DEFAULT_VEHICLE.capacity) {
    return {
      transportFcfa: 0,
      totalFcfa: 0,
      ratePerKm: null,
      outboundKm,
      returnKm,
      billableKm,
      formulaApplied: `Capacité ${DEFAULT_VEHICLE.model} dépassée (>${DEFAULT_VEHICLE.capacity})`,
      ruleKey: "over_capacity",
      label: "Cotation manuelle",
      tariffVersionCode: "HYUNDAI_STAREX_PUBLIC_V1",
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: true,
      estimatif: false,
      requiresManualValidation: true,
      feeLines: [],
      breakdown: ["Plus de 10 passagers — validation SentraJet"],
      internalOnly: { priceLayer: input.priceLayer },
    };
  }

  const layerRules = catalog.filter((r) => r.priceLayer === input.priceLayer);
  const isMad = input.serviceType === "mise_a_disposition";
  const isManualFamily =
    input.serviceType === "autre" ||
    input.serviceType === "ceremonie" ||
    input.serviceType === "groupe_evenement";

  if (isManualFamily) {
    return {
      transportFcfa: 0,
      totalFcfa: 0,
      ratePerKm: null,
      outboundKm,
      returnKm,
      billableKm,
      formulaApplied: "Hors grille — cotation SentraJet",
      ruleKey: "manual_quote",
      label: "Sur devis",
      tariffVersionCode: layerRules[0]?.versionCode ?? "HYUNDAI_STAREX_PUBLIC_V1",
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: true,
      estimatif: false,
      requiresManualValidation: true,
      feeLines: [],
      breakdown: ["Prestation hors calcul kilométrique standard"],
      internalOnly: { priceLayer: input.priceLayer },
    };
  }

  // ——— Mise à disposition ———
  if (isMad) {
    const madRules = layerRules.filter((r) => r.serviceFamily === "mad");
    const rule =
      madRules.find((r) => r.zone === zone) ||
      madRules.find((r) => r.zone === "dakar") ||
      madRules[0];

    if (!rule) {
      return {
        transportFcfa: 0,
        totalFcfa: 0,
        ratePerKm: null,
        outboundKm,
        returnKm,
        billableKm,
        formulaApplied: "MAD sans grille",
        ruleKey: "mad_missing",
        label: "Sur devis",
        tariffVersionCode: "MISSING",
        charteVersion: CHARTE_VERSION,
        vehicleModel: DEFAULT_VEHICLE.model,
        surDevis: true,
        estimatif: false,
        requiresManualValidation: true,
        feeLines: [],
        breakdown: ["Aucune règle MAD pour cette couche"],
        internalOnly: { priceLayer: input.priceLayer },
      };
    }

    if (rule.pricingMode === "manual") {
      return {
        transportFcfa: 0,
        totalFcfa: 0,
        ratePerKm: null,
        outboundKm,
        returnKm,
        billableKm: oneWayKm,
        formulaApplied: `${rule.label} — validation SentraJet`,
        ruleKey: rule.ruleKey,
        label: "Sur devis",
        tariffVersionCode: rule.versionCode,
        charteVersion: CHARTE_VERSION,
        vehicleModel: DEFAULT_VEHICLE.model,
        surDevis: true,
        estimatif: false,
        requiresManualValidation: true,
        feeLines: policyLines(rule),
        breakdown: [
          `Zone : ${rule.zone}`,
          "Carburant / péages / parking / ferry : exclus",
        ],
        internalOnly: { priceLayer: input.priceLayer },
      };
    }

    let transport = Number(rule.basePriceFcfa) || 0;
    let formula = `${rule.label} — forfait ${transport.toLocaleString("fr-FR")} FCFA`;
    if (rule.pricingMode === "forfait_plus_extra_km") {
      const included = Number(rule.includedDistanceKm ?? 0);
      const extraRate = Number(rule.extraKmPriceFcfa ?? 0);
      const extraKm = Math.max(0, oneWayKm - included);
      const extra = extraKm * extraRate;
      transport = Number(rule.basePriceFcfa) + extra;
      formula = `${Number(rule.basePriceFcfa).toLocaleString("fr-FR")} + (${extraKm} km × ${extraRate} F)`;
      breakdown.push(`Km inclus : ${included} · hors forfait : ${extraKm} km`);
    }
    transport = commercialRound(transport, roundingStep);
    breakdown.push(`Zone : ${rule.zone}`);
    breakdown.push("Carburant / péages / parking / ferry : exclus du forfait (lignes séparées)");

    return {
      transportFcfa: transport,
      totalFcfa: transport,
      ratePerKm: null,
      outboundKm,
      returnKm,
      billableKm: oneWayKm,
      formulaApplied: formula,
      ruleKey: rule.ruleKey,
      label: rule.label,
      tariffVersionCode: rule.versionCode,
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: false,
      estimatif: true,
      requiresManualValidation: oneWayKm >= 250 || passengers >= 9,
      feeLines: policyLines(rule),
      breakdown,
      internalOnly: { priceLayer: input.priceLayer },
    };
  }

  // ——— Trajets (public km / partenaire km) ———
  if (!oneWayKm) {
    return {
      transportFcfa: 0,
      totalFcfa: 0,
      ratePerKm: null,
      outboundKm: 0,
      returnKm: 0,
      billableKm: 0,
      formulaApplied: "Distance routière requise",
      ruleKey: "distance_required",
      label: "Indiquez le trajet",
      tariffVersionCode: layerRules[0]?.versionCode ?? "HYUNDAI_STAREX_PUBLIC_V1",
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: true,
      estimatif: false,
      requiresManualValidation: false,
      feeLines: [],
      breakdown: ["Le moteur exige une distance routière réelle (OSM/Google), pas une estimation à vol d’oiseau"],
      internalOnly: { priceLayer: input.priceLayer },
    };
  }

  if (input.priceLayer === "public") {
    const rate = publicKmRateFromCatalog(passengers, catalog);
    const bandRule = layerRules.find(
      (r) =>
        r.serviceFamily === "trajet" &&
        r.pricingMode === "per_km" &&
        r.passengersMin != null &&
        r.passengersMax != null &&
        passengers >= r.passengersMin &&
        passengers <= r.passengersMax
    );
    let transport = commercialRound(billableKm * rate, roundingStep);
    let formula = `${rate} FCFA/km × ${billableKm} km`;
    let ruleKey = bandRule?.ruleKey ?? `public_km_${rate}`;
    let label = `${rate.toLocaleString("fr-FR")} F/km`;

    if (
      !isRoundTrip &&
      oneWayKm <= shortMaxKm &&
      transport < shortMin &&
      input.serviceType !== "longue_distance"
    ) {
      transport = shortMin;
      formula = `Minimum ${shortMin.toLocaleString("fr-FR")} FCFA (≤ ${shortMaxKm} km)`;
      ruleKey = "public_short_min";
      label = "Course courte (minimum)";
      breakdown.push(`Calcul km ${billableKm * rate} < minimum opérationnel`);
    }

    breakdown.push(`Distance aller (route) : ${outboundKm} km`);
    if (isRoundTrip) breakdown.push(`Distance retour : ${returnKm} km · total facturable ${billableKm} km`);
    breakdown.push(`Bande passagers ${passengers} → ${rate} F/km`);
    breakdown.push("Péages / parking / ferry : non inclus automatiquement");

    const feeBase = bandRule ?? {
      fuelPolicy: "exclu" as FeePolicy,
      tollPolicy: "exclu" as FeePolicy,
      parkingPolicy: "exclu" as FeePolicy,
      ferryPolicy: "exclu" as FeePolicy,
      driverPolicy: "inclus" as FeePolicy,
    };

    return {
      transportFcfa: transport,
      totalFcfa: transport,
      ratePerKm: rate,
      outboundKm,
      returnKm,
      billableKm,
      formulaApplied: formula,
      ruleKey,
      label,
      tariffVersionCode: bandRule?.versionCode ?? "HYUNDAI_STAREX_PUBLIC_V1",
      charteVersion: CHARTE_VERSION,
      vehicleModel: DEFAULT_VEHICLE.model,
      surDevis: false,
      estimatif: true,
      requiresManualValidation: oneWayKm >= 250 || isRoundTrip && oneWayKm >= 150,
      feeLines: [
        { key: "transport", label: "Transport", amountFcfa: transport, status: "estime" },
        ...policyLines(feeBase),
      ],
      breakdown,
      internalOnly: { priceLayer: "public" },
    };
  }

  // Partner trajet
  const partnerKm =
    layerRules.find((r) => r.serviceFamily === "trajet" && r.pricingMode === "per_km") ||
    catalog.find((r) => r.priceLayer === "partner" && r.ruleKey === "partner_interurbain_km");
  const rate = Number(partnerKm?.pricePerKmFcfa ?? 700);
  const minPrice = Number(partnerKm?.minimumPriceFcfa ?? 30000);
  let transport = commercialRound(Math.max(minPrice, billableKm * rate), roundingStep);
  breakdown.push(`Tarif partenaire ${rate} F/km · min ${minPrice.toLocaleString("fr-FR")} FCFA`);
  breakdown.push(`Distance facturable ${billableKm} km (route)`);

  return {
    transportFcfa: transport,
    totalFcfa: transport,
    ratePerKm: rate,
    outboundKm,
    returnKm,
    billableKm,
    formulaApplied: `max(${minPrice}, ${billableKm} × ${rate})`,
    ruleKey: partnerKm?.ruleKey ?? "partner_interurbain_km",
    label: partnerKm?.label ?? "Tarif partenaire",
    tariffVersionCode: partnerKm?.versionCode ?? "HYUNDAI_STAREX_PARTNER_V1",
    charteVersion: CHARTE_VERSION,
    vehicleModel: DEFAULT_VEHICLE.model,
    surDevis: false,
    estimatif: true,
    requiresManualValidation: oneWayKm >= 250,
    feeLines: partnerKm
      ? [{ key: "transport", label: "Transport", amountFcfa: transport, status: "estime" }, ...policyLines(partnerKm)]
      : [],
    breakdown,
    internalOnly: { priceLayer: "partner" },
  };
}
