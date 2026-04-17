import { supabase } from "@/lib/supabase";
import { clampNonNegative, percentOf, roundFcfa } from "@/lib/pricingMath";

export type PriceSimulationParams = {
  distanceKm: number;
  fuelType: string;
  vehicleCategory: string;
  withDriver: boolean;
};

export type PriceSimulationResult = {
  fuelCostFcfa: number;
  operationalCostFcfa: number;
  marginFcfa: number;
  totalSuggestedFcfa: number;
};

type FuelPrice = {
  fuel_type: string;
  unit_price_fcfa: number;
};

type ConsumptionProfile = {
  vehicle_category: string;
  fuel_type: string;
  liters_per_100km: number;
  with_driver_overhead_fcfa: number;
};

type PricingRule = {
  margin_percent: number;
  operational_fee_fcfa: number;
  with_driver_fee_fcfa: number;
};

let fuelCache: FuelPrice[] | null = null;
let profileCache: ConsumptionProfile[] | null = null;
let pricingRuleCache: PricingRule | null = null;

async function loadPricingReferences() {
  if (fuelCache && profileCache && pricingRuleCache) {
    return { fuels: fuelCache, profiles: profileCache, rule: pricingRuleCache };
  }

  const [{ data: fuels }, { data: profiles }, { data: rules }] = await Promise.all([
    supabase.from("fuel_prices").select("fuel_type, unit_price_fcfa"),
    supabase
      .from("vehicle_consumption_profiles")
      .select("vehicle_category, fuel_type, liters_per_100km, with_driver_overhead_fcfa"),
    supabase
      .from("pricing_rules")
      .select("margin_percent, operational_fee_fcfa, with_driver_fee_fcfa")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  fuelCache = (fuels ?? []) as FuelPrice[];
  profileCache = (profiles ?? []) as ConsumptionProfile[];
  pricingRuleCache = ((rules ?? [])[0] as PricingRule | undefined) ?? {
    margin_percent: 30,
    operational_fee_fcfa: 1500,
    with_driver_fee_fcfa: 5000,
  };

  return { fuels: fuelCache, profiles: profileCache, rule: pricingRuleCache };
}

export async function simulatePriceFromDistance(
  params: PriceSimulationParams
): Promise<PriceSimulationResult> {
  const refs = await loadPricingReferences();
  const normalizedFuel = params.fuelType.toLowerCase();
  const normalizedCategory = params.vehicleCategory.toLowerCase();

  const fuel = refs.fuels.find((f) => f.fuel_type.toLowerCase() === normalizedFuel) ??
    refs.fuels.find((f) => f.fuel_type.toLowerCase() === "essence") ?? {
      fuel_type: "essence",
      unit_price_fcfa: 890,
    };

  const profile = refs.profiles.find(
    (p) =>
      p.vehicle_category.toLowerCase() === normalizedCategory &&
      p.fuel_type.toLowerCase() === fuel.fuel_type.toLowerCase()
  ) ??
    refs.profiles.find((p) => p.vehicle_category.toLowerCase() === normalizedCategory) ??
    refs.profiles.find((p) => p.vehicle_category.toLowerCase() === "standard") ?? {
      vehicle_category: "standard",
      fuel_type: fuel.fuel_type,
      liters_per_100km: 8,
      with_driver_overhead_fcfa: 2500,
    };

  const fuelCostFcfa = roundFcfa((clampNonNegative(params.distanceKm) / 100) * profile.liters_per_100km * fuel.unit_price_fcfa);
  const operationalBase = clampNonNegative(Number(refs.rule.operational_fee_fcfa ?? 0));
  const withDriverCost = params.withDriver
    ? clampNonNegative(Number(refs.rule.with_driver_fee_fcfa ?? 0)) + clampNonNegative(Number(profile.with_driver_overhead_fcfa ?? 0))
    : 0;
  const operationalCostFcfa = roundFcfa(operationalBase + withDriverCost);
  const subTotal = fuelCostFcfa + operationalCostFcfa;
  const marginFcfa = roundFcfa(percentOf(subTotal, Number(refs.rule.margin_percent ?? 30)));
  return {
    fuelCostFcfa,
    operationalCostFcfa,
    marginFcfa,
    totalSuggestedFcfa: subTotal + marginFcfa,
  };
}
