import {
  listBusinessRules,
  ruleNullableNumber,
  ruleNumber,
  type BusinessRule,
} from "@/lib/engines/businessRules";
import { roundFcfa } from "@/lib/pricingMath";

export type CancellationQuote = {
  hoursBeforePickup: number;
  feePercent: number | null;
  feeFcfa: number;
  band: string;
  decisionPending: boolean;
  note: string;
};

/**
 * Calcule les frais d'annulation selon les règles paramétrables.
 * La tranche 2h–4h reste ouverte (D-01) si le paramètre est null.
 */
export function computeCancellationFee(
  amountFcfa: number,
  pickupAt: Date,
  cancelledAt: Date,
  rules: BusinessRule[]
): CancellationQuote {
  const hours = (pickupAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
  const over6 = ruleNumber(rules, "cancellation", "fee_over_6h_percent", 0);
  const from4to6 = ruleNumber(rules, "cancellation", "fee_4h_to_6h_percent", 30);
  const under2 = ruleNumber(rules, "cancellation", "fee_under_2h_percent", 50);
  const from2to4 = ruleNullableNumber(rules, "cancellation", "fee_2h_to_4h_percent");

  if (hours > 6) {
    return {
      hoursBeforePickup: hours,
      feePercent: over6,
      feeFcfa: roundFcfa((amountFcfa * over6) / 100),
      band: "> 6h",
      decisionPending: false,
      note: "Sans frais",
    };
  }
  if (hours >= 4) {
    return {
      hoursBeforePickup: hours,
      feePercent: from4to6,
      feeFcfa: roundFcfa((amountFcfa * from4to6) / 100),
      band: "4h–6h",
      decisionPending: false,
      note: `${from4to6}% du montant`,
    };
  }
  if (hours >= 2) {
    if (from2to4 == null) {
      return {
        hoursBeforePickup: hours,
        feePercent: null,
        feeFcfa: 0,
        band: "2h–4h",
        decisionPending: true,
        note: "Décision métier ouverte (D-01) — règle non inventée",
      };
    }
    return {
      hoursBeforePickup: hours,
      feePercent: from2to4,
      feeFcfa: roundFcfa((amountFcfa * from2to4) / 100),
      band: "2h–4h",
      decisionPending: false,
      note: `${from2to4}% du montant`,
    };
  }
  return {
    hoursBeforePickup: hours,
    feePercent: under2,
    feeFcfa: roundFcfa((amountFcfa * under2) / 100),
    band: "< 2h",
    decisionPending: false,
    note: `${under2}% du montant`,
  };
}

export async function quoteCancellation(amountFcfa: number, pickupAt: Date, cancelledAt = new Date()) {
  const rules = await listBusinessRules("cancellation");
  return computeCancellationFee(amountFcfa, pickupAt, cancelledAt, rules);
}
