import { supabase } from "@/lib/supabase";
import { roundFcfa } from "@/lib/pricingMath";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import { ceilDistanceKm } from "@/lib/routeDistances";

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

export type CapacityBand = "1_2" | "3_5" | "6_8" | "9_11" | "over";

export function capacityBand(passengers: number): CapacityBand {
  if (passengers <= 2) return "1_2";
  if (passengers <= 5) return "3_5";
  if (passengers <= 8) return "6_8";
  if (passengers <= 11) return "9_11";
  return "over";
}

export function suggestedVehicleClass(passengers: number, luggage: number): {
  label: string;
  seats: number;
  luggageHint: string;
  alert: string | null;
} {
  const needSeats = Math.max(passengers, 1);
  if (needSeats > 11 || luggage > 12) {
    return {
      label: "Plusieurs véhicules / cotation",
      seats: 11,
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
    label: "Grand van 9–11 places",
    seats: 11,
    luggageHint: "jusqu’à ~12 valises",
    alert: luggage > 12 ? "Bagages trop nombreux — cotation requise." : null,
  };
}

export function vehiclesNeededForGroup(passengers: number, seatsPerVehicle = 11): number {
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
  capacityBand: CapacityBand;
  vehicleSuggestion: ReturnType<typeof suggestedVehicleClass>;
  breakdown: string[];
};

function publicKmRate(passengers: number): number {
  if (passengers <= 5) return 450;
  return 600;
}

function partnerAibdAmount(passengers: number): { amount: number; surDevis: boolean; key: string; label: string } {
  if (passengers <= 2) return { amount: 20000, surDevis: false, key: "b2b_aibd_1_2", label: "B2B AIBD 1–2" };
  if (passengers <= 5) return { amount: 25000, surDevis: false, key: "b2b_aibd_3_5", label: "B2B AIBD 3–5" };
  if (passengers <= 8) return { amount: 30000, surDevis: false, key: "b2b_aibd_6_8", label: "B2B AIBD 6–8" };
  if (passengers <= 11) return { amount: 40000, surDevis: false, key: "b2b_aibd_9_11", label: "B2B AIBD 9–11" };
  return { amount: 0, surDevis: true, key: "b2b_aibd_devis", label: "B2B AIBD — cotation" };
}

function partnerAibdRetour(passengers: number): { amount: number; surDevis: boolean; key: string; label: string } {
  if (passengers <= 3) return { amount: 30000, surDevis: false, key: "b2b_retour_1_3", label: "B2B AIBD+retour 1–3" };
  if (passengers <= 5) return { amount: 0, surDevis: true, key: "b2b_retour_4_5", label: "B2B AIBD+retour 4–5 — cotation" };
  if (passengers <= 8) return { amount: 50000, surDevis: false, key: "b2b_retour_6_8", label: "B2B AIBD+retour 6–8" };
  return { amount: 0, surDevis: true, key: "b2b_retour_devis", label: "B2B AIBD+retour — cotation" };
}

function publicAibdAmount(passengers: number): { amount: number; key: string; label: string } {
  // « à partir de 20 000 » — grille publique progressive
  if (passengers <= 2) return { amount: 20000, key: "pub_aibd_1_2", label: "Transfert AIBD (dès 20 000)" };
  if (passengers <= 5) return { amount: 25000, key: "pub_aibd_3_5", label: "Transfert AIBD 3–5" };
  if (passengers <= 8) return { amount: 35000, key: "pub_aibd_6_8", label: "Transfert AIBD 6–8" };
  if (passengers <= 11) return { amount: 45000, key: "pub_aibd_9_11", label: "Transfert AIBD 9–11" };
  return { amount: 0, key: "pub_aibd_devis", label: "Transfert AIBD — cotation" };
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
}): PriceQuote {
  const passengers = Math.max(1, params.passengers);
  const luggage = Math.max(0, params.luggage ?? 0);
  const tripMode = params.tripMode ?? "aller_simple";
  const oneWayKm = ceilDistanceKm(Number(params.distanceKm ?? 0));
  const longFrom = params.longDistanceFromKm ?? 250;
  const band = capacityBand(passengers);
  const vehicleSuggestion = suggestedVehicleClass(passengers, luggage);
  const vehiclesNeeded = vehiclesNeededForGroup(passengers, 11);
  const breakdown: string[] = [];

  let amountBeforeDiscountFcfa = 0;
  let waitingFeeFcfa = 0;
  let label = "Sur devis";
  let formulaApplied = "Cotation manuelle";
  let ruleKey = "devis";
  let surDevis = false;
  let estimatif = true;
  let billableKm = oneWayKm;

  // Retour différé / complexité → cotation
  if (tripMode === "retour_differe") {
    return {
      amountFcfa: 0,
      amountBeforeDiscountFcfa: 0,
      discountPercent: 0,
      discountFcfa: 0,
      waitingFeeFcfa: 0,
      label: "Retour différé — cotation manuelle requise",
      ruleKey: "retour_differe",
      formulaApplied: "Deux trajets / cotation spécifique",
      surDevis: true,
      estimatif: false,
      vehiclesNeeded,
      billableKm: oneWayKm,
      distanceKm: oneWayKm,
      capacityBand: band,
      vehicleSuggestion,
      breakdown: ["Retour différé hors grille automatique"],
    };
  }

  if (band === "over" || vehicleSuggestion.alert?.includes("cotation")) {
    surDevis = true;
  }

  if (params.serviceType === "autre") {
    surDevis = true;
    formulaApplied = "Hors grille — cotation SentraJet";
    breakdown.push("Demande libre");
  } else if (params.serviceType === "transfert_aibd") {
    if (params.segment === "partner") {
      const r = partnerAibdAmount(passengers);
      amountBeforeDiscountFcfa = r.amount;
      surDevis = r.surDevis;
      ruleKey = r.key;
      label = r.label;
      formulaApplied = "Forfait B2B AIBD selon passagers";
    } else {
      const r = publicAibdAmount(passengers);
      amountBeforeDiscountFcfa = r.amount;
      surDevis = r.amount === 0;
      ruleKey = r.key;
      label = r.label;
      formulaApplied = "Forfait public AIBD (dès 20 000 FCFA)";
    }
    breakdown.push(`Bande passagers : ${band.replace("_", "–")}`);
  } else if (params.serviceType === "aibd_retour") {
    if (params.segment === "partner") {
      const r = partnerAibdRetour(passengers);
      amountBeforeDiscountFcfa = r.amount;
      surDevis = r.surDevis;
      ruleKey = r.key;
      label = r.label;
      formulaApplied = "Forfait B2B récupération AIBD + retour";
    } else {
      // Public : forfait AIBD × logique retour (~1.5) ou cotation
      const base = publicAibdAmount(passengers);
      amountBeforeDiscountFcfa = base.amount === 0 ? 0 : roundFcfa(base.amount * 1.5);
      surDevis = base.amount === 0;
      ruleKey = "pub_aibd_retour";
      label = "AIBD + retour (estimation)";
      formulaApplied = "Estimation publique AIBD + retour";
    }
  } else if (params.serviceType === "mise_a_disposition") {
    amountBeforeDiscountFcfa = 50000;
    ruleKey = "mad_10h";
    label = "Mise à disposition 10 h (Dakar)";
    formulaApplied = "50 000 FCFA / 10 heures à Dakar";
    breakdown.push("Attente incluse dans la mise à disposition");
    if (oneWayKm > 100 || params.serviceType === "mise_a_disposition" && oneWayKm > 80) {
      // hors Dakar / long → devis si très loin
      if (oneWayKm > 120) {
        surDevis = true;
        formulaApplied = "MAD hors zone Dakar — cotation";
        amountBeforeDiscountFcfa = 50000;
        breakdown.push("Zone étendue : cotation manuelle recommandée");
      }
    }
  } else if (params.serviceType === "ceremonie" || params.serviceType === "groupe_evenement") {
    amountBeforeDiscountFcfa = 45000;
    ruleKey = "ceremonie_min";
    label = "Cérémonies & sorties (dès 45 000)";
    formulaApplied = "À partir de 45 000 FCFA — selon durée / distance";
    surDevis = true;
    estimatif = true;
    breakdown.push("Prix indicatif minimum — cotation selon le brief");
  } else if (
    params.serviceType === "longue_distance" ||
    (params.serviceType === "interurbain" && oneWayKm >= longFrom)
  ) {
    surDevis = true;
    ruleKey = "longue_distance";
    label = "Longue distance — cotation";
    formulaApplied = "Selon distance, durée, passagers et bagages";
    breakdown.push(`Distance ${oneWayKm || "?"} km — hors calcul standard`);
    // Indication indicative au km public pour aide
    if (oneWayKm > 0 && params.segment === "client") {
      const rate = publicKmRate(passengers);
      billableKm = tripMode === "aller_retour" ? oneWayKm * 2 : oneWayKm;
      amountBeforeDiscountFcfa = roundFcfa(billableKm * rate);
      estimatif = true;
      breakdown.push(`Indication ${rate} F/km × ${billableKm} km (non contractuel)`);
    } else if (oneWayKm > 0 && params.segment === "partner") {
      billableKm = tripMode === "aller_retour" ? oneWayKm * 2 : oneWayKm;
      amountBeforeDiscountFcfa = Math.max(30000, roundFcfa(billableKm * 700));
      estimatif = true;
      breakdown.push(`Indication B2B 700 F/km × ${billableKm} km (min 30 000)`);
    }
  } else if (params.serviceType === "interurbain") {
    billableKm = tripMode === "aller_retour" ? oneWayKm * 2 : oneWayKm;
    if (!oneWayKm) {
      surDevis = true;
      label = "Indiquez la destination pour estimer";
      formulaApplied = "Distance requise";
      breakdown.push("Distance routière non disponible");
    } else if (params.segment === "partner") {
      // B2B : >50 km → 700/km min 30k ; sinon même logique min
      const rate = 700;
      const raw = roundFcfa(billableKm * rate);
      amountBeforeDiscountFcfa = Math.max(30000, raw);
      ruleKey = "b2b_interurbain_km";
      label = `${rate.toLocaleString("fr-FR")} F/km`;
      formulaApplied =
        oneWayKm > 50
          ? "B2B interurbain > 50 km : 700 F/km, min 30 000"
          : "B2B court trajet : 700 F/km, min 30 000";
      if (amountBeforeDiscountFcfa > raw) breakdown.push("Minimum de facturation 30 000 FCFA appliqué");
      breakdown.push(`Distance aller ${oneWayKm} km${tripMode === "aller_retour" ? " × 2" : ""} = ${billableKm} km`);
    } else {
      // Public : ≤45 km → 20 000 ; sinon au km selon pax
      if (oneWayKm <= 45 && tripMode === "aller_simple") {
        amountBeforeDiscountFcfa = 20000;
        ruleKey = "pub_course_45";
        label = "Course ≤ 45 km";
        formulaApplied = "Forfait 20 000 FCFA jusqu’à 45 km";
        breakdown.push(`Distance ${oneWayKm} km ≤ 45 km`);
      } else {
        const rate = publicKmRate(passengers);
        amountBeforeDiscountFcfa = Math.max(20000, roundFcfa(billableKm * rate));
        ruleKey = passengers <= 5 ? "pub_km_450" : "pub_km_600";
        label = `${rate.toLocaleString("fr-FR")} F/km`;
        formulaApplied =
          passengers <= 5
            ? "450 FCFA/km jusqu’à 5 personnes"
            : "600 FCFA/km jusqu’à 10 personnes";
        breakdown.push(`Distance ${oneWayKm} km${tripMode === "aller_retour" ? " × 2 (AR)" : ""} = ${billableKm} km`);
        breakdown.push(`Tarif ${rate} F/km (bande ${band.replace("_", "–")})`);
      }
    }
  }

  // Attente (hors MAD)
  if (tripMode === "attente" || (params.waitingMinutes ?? 0) > 0) {
    waitingFeeFcfa = computeWaitingFeeFcfa({
      serviceType: params.serviceType,
      waitingMinutes: params.waitingMinutes ?? (tripMode === "attente" ? 60 : 0),
    });
    if (waitingFeeFcfa > 0) {
      amountBeforeDiscountFcfa += waitingFeeFcfa;
      breakdown.push(`Attente facturable : ${waitingFeeFcfa.toLocaleString("fr-FR")} FCFA (tolérance 30 min, puis 2 500 / 30 min)`);
    } else if (params.serviceType === "mise_a_disposition") {
      breakdown.push("Attente incluse (mise à disposition)");
    }
  }

  if (vehicleSuggestion.alert) breakdown.push(vehicleSuggestion.alert);
  if (vehiclesNeeded > 1) breakdown.push(`Environ ${vehiclesNeeded} véhicules nécessaires`);

  const discountPercent =
    params.segment === "client" && params.applyAccountDiscount && !surDevis && amountBeforeDiscountFcfa > 0
      ? Math.max(0, params.accountDiscountPercent ?? 10)
      : 0;
  const discountFcfa = roundFcfa((amountBeforeDiscountFcfa * discountPercent) / 100);
  const amountFcfa = Math.max(0, amountBeforeDiscountFcfa - discountFcfa);

  if (discountPercent > 0) {
    breakdown.push(`Remise compte −${discountPercent}%`);
    label = `${label} · −${discountPercent}% compte`;
  }

  return {
    amountFcfa,
    amountBeforeDiscountFcfa,
    discountPercent,
    discountFcfa,
    waitingFeeFcfa,
    label,
    ruleKey,
    formulaApplied,
    surDevis,
    estimatif: estimatif || !surDevis,
    vehiclesNeeded,
    billableKm,
    distanceKm: oneWayKm,
    capacityBand: band,
    vehicleSuggestion,
    breakdown,
  };
}

/** Compat async — règles business optionnelles */
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
  const rules = await listBusinessRules("pricing").catch(() => []);
  return computeSentrajetPrice({
    ...params,
    accountDiscountPercent: ruleNumber(rules, "pricing", "account_discount_percent", 10),
    longDistanceFromKm: ruleNumber(rules, "pricing", "long_distance_from_km", 250),
  });
}

export function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

/** Conservé pour admin tarifs — lecture DB optionnelle */
export type SentrajetTariff = {
  id?: string;
  segment: PricingSegment;
  rule_key: string;
  label: string;
  amount_fcfa: number;
  unit: "forfait" | "per_km";
  is_active?: boolean;
};

export async function getSentrajetTariffs(segment?: PricingSegment): Promise<SentrajetTariff[]> {
  try {
    let query = supabase.from("sentrajet_tariffs").select("*").eq("is_active", true);
    if (segment) query = query.eq("segment", segment);
    const { data, error } = await query.order("rule_key");
    if (error || !data?.length) return [];
    return data as SentrajetTariff[];
  } catch {
    return [];
  }
}
