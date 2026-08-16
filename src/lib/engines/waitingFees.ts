import { listBusinessRules, ruleNumber, type BusinessRule } from "@/lib/engines/businessRules";
import { roundFcfa } from "@/lib/pricingMath";

export type WaitingFeeQuote = {
  waitingMinutes: number;
  freeMinutes: number;
  billableMinutes: number;
  blocks: number;
  feeFcfa: number;
};

export function computeWaitingFee(waitingMinutes: number, rules: BusinessRule[]): WaitingFeeQuote {
  const freeMinutes = ruleNumber(rules, "waiting", "free_minutes", 30);
  const blockMinutes = ruleNumber(rules, "waiting", "block_minutes", 30);
  const feePerBlock = ruleNumber(rules, "waiting", "fee_per_block_fcfa", 2500);
  const safeWait = Math.max(0, waitingMinutes);
  const billable = Math.max(0, safeWait - freeMinutes);
  const blocks = billable <= 0 ? 0 : Math.ceil(billable / Math.max(1, blockMinutes));
  return {
    waitingMinutes: safeWait,
    freeMinutes,
    billableMinutes: billable,
    blocks,
    feeFcfa: roundFcfa(blocks * feePerBlock),
  };
}

export async function quoteWaitingFee(waitingMinutes: number) {
  const rules = await listBusinessRules("waiting");
  return computeWaitingFee(waitingMinutes, rules);
}
