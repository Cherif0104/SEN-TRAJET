import { supabase } from "@/lib/supabase";
import { getCommissionConfig } from "@/lib/partners";

export type PickupMode = "driver_point" | "home_pickup";

export type PricingRule = {
  id: string;
  scope: "global" | "region" | "route" | string;
  region_from: string | null;
  region_to: string | null;
  home_pickup_extra_fcfa: number;
  platform_fee_percent: number;
  partner_share_percent: number;
  is_active: boolean;
};

export type PriceBreakdown = {
  basePriceFcfa: number;
  pickupMode: PickupMode;
  pickupExtraFcfa: number;
  totalPriceFcfa: number;
  platformFeePercent: number;
  partnerSharePercent: number;
};

export type RentalPriceBreakdown = {
  days: number;
  dailyRateFcfa: number;
  subtotalFcfa: number;
  depositFcfa: number;
  totalClientFcfa: number;
  platformCommissionFcfa: number;
  partnerCommissionFcfa: number;
  ownerNetFcfa: number;
  platformFeePercent: number;
  partnerSharePercent: number;
};

const FALLBACK_RULE: PricingRule = {
  id: "fallback",
  scope: "global",
  region_from: null,
  region_to: null,
  home_pickup_extra_fcfa: 2000,
  platform_fee_percent: 10,
  partner_share_percent: 4,
  is_active: true,
};

export async function getActiveGlobalPricingRule(): Promise<PricingRule> {
  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("is_active", true)
    .eq("scope", "global")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return FALLBACK_RULE;
  return data as PricingRule;
}

export async function computePriceBreakdown(params: {
  basePriceFcfa: number;
  pickupMode: PickupMode;
  homePickupExtraFcfa?: number;
}): Promise<PriceBreakdown> {
  const rule = await getActiveGlobalPricingRule();
  const pickupExtraFcfa =
    params.pickupMode === "home_pickup"
      ? Math.max(0, params.homePickupExtraFcfa ?? rule.home_pickup_extra_fcfa)
      : 0;

  const totalPriceFcfa = Math.max(0, params.basePriceFcfa) + pickupExtraFcfa;

  return {
    basePriceFcfa: Math.max(0, params.basePriceFcfa),
    pickupMode: params.pickupMode,
    pickupExtraFcfa,
    totalPriceFcfa,
    platformFeePercent: rule.platform_fee_percent,
    partnerSharePercent: rule.partner_share_percent,
  };
}

export async function computeRentalPriceBreakdown(params: {
  dailyRateFcfa: number;
  days: number;
  depositFcfa?: number;
  mode: "platform_managed" | "marketplace_partner";
  partnerId?: string | null;
}) {
  const cfg = await getCommissionConfig(params.partnerId ?? undefined);
  const platformFeePercent = cfg?.platform_percent ?? 10;
  const partnerSharePercent = cfg?.partner_percent ?? 4;

  const safeDays = Math.max(1, params.days);
  const subtotalFcfa = Math.max(0, params.dailyRateFcfa) * safeDays;
  const depositFcfa = Math.max(0, params.depositFcfa ?? 0);
  const platformCommissionFcfa = Math.round((subtotalFcfa * platformFeePercent) / 100);
  const partnerCommissionFcfa =
    params.mode === "marketplace_partner"
      ? Math.round((subtotalFcfa * partnerSharePercent) / 100)
      : 0;
  const ownerNetFcfa = Math.max(0, subtotalFcfa - platformCommissionFcfa - partnerCommissionFcfa);

  return {
    days: safeDays,
    dailyRateFcfa: Math.max(0, params.dailyRateFcfa),
    subtotalFcfa,
    depositFcfa,
    totalClientFcfa: subtotalFcfa + depositFcfa,
    platformCommissionFcfa,
    partnerCommissionFcfa,
    ownerNetFcfa,
    platformFeePercent,
    partnerSharePercent,
  } as RentalPriceBreakdown;
}
