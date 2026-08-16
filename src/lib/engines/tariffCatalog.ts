import { supabase } from "@/lib/supabase";
import { buildDefaultCatalog, type PriceLayer, type TariffRule } from "@/lib/engines/tariffDefaults";

type DbVersion = {
  id: string;
  code: string;
  price_layer: PriceLayer;
  is_active: boolean;
};

type DbRule = {
  version_id: string;
  service_family: string;
  rule_key: string;
  label: string;
  pricing_mode: TariffRule["pricingMode"];
  passengers_min: number | null;
  passengers_max: number | null;
  zone: TariffRule["zone"];
  base_price_fcfa: number | string;
  price_per_km_fcfa: number | string | null;
  included_distance_km: number | string | null;
  included_duration_hours: number | string | null;
  extra_km_price_fcfa: number | string | null;
  extra_hour_price_fcfa: number | string | null;
  minimum_price_fcfa: number | string | null;
  fuel_policy: TariffRule["fuelPolicy"];
  toll_policy: TariffRule["tollPolicy"];
  parking_policy: TariffRule["parkingPolicy"];
  ferry_policy: TariffRule["ferryPolicy"];
  driver_policy: TariffRule["driverPolicy"];
  is_active: boolean;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Charge le catalogue pour une couche.
 * La couche `supplier` ne doit être demandée que côté admin / serveur.
 */
export async function loadTariffCatalog(priceLayer: PriceLayer): Promise<TariffRule[]> {
  if (priceLayer === "supplier" && typeof window !== "undefined") {
    // Sécurité : jamais charger le fournisseur depuis le navigateur public.
    return buildDefaultCatalog().filter((r) => r.priceLayer === "public");
  }

  try {
    const { data: versions, error: vErr } = await supabase
      .from("pricing_tariff_versions")
      .select("id, code, price_layer, is_active")
      .eq("is_active", true)
      .eq("price_layer", priceLayer);

    if (vErr || !versions?.length) {
      return buildDefaultCatalog().filter((r) => r.priceLayer === priceLayer);
    }

    const versionIds = (versions as DbVersion[]).map((v) => v.id);
    const codeById = Object.fromEntries((versions as DbVersion[]).map((v) => [v.id, v.code]));

    const { data: rules, error: rErr } = await supabase
      .from("pricing_tariff_rules")
      .select("*")
      .eq("is_active", true)
      .in("version_id", versionIds)
      .order("sort_order");

    if (rErr || !rules?.length) {
      return buildDefaultCatalog().filter((r) => r.priceLayer === priceLayer);
    }

    return (rules as DbRule[]).map((r) => ({
      versionCode: codeById[r.version_id] ?? "UNKNOWN",
      priceLayer,
      serviceFamily: r.service_family,
      ruleKey: r.rule_key,
      label: r.label,
      pricingMode: r.pricing_mode,
      passengersMin: r.passengers_min,
      passengersMax: r.passengers_max,
      zone: r.zone,
      basePriceFcfa: num(r.base_price_fcfa) ?? 0,
      pricePerKmFcfa: num(r.price_per_km_fcfa),
      includedDistanceKm: num(r.included_distance_km),
      includedDurationHours: num(r.included_duration_hours),
      extraKmPriceFcfa: num(r.extra_km_price_fcfa),
      extraHourPriceFcfa: num(r.extra_hour_price_fcfa),
      minimumPriceFcfa: num(r.minimum_price_fcfa),
      fuelPolicy: r.fuel_policy,
      tollPolicy: r.toll_policy,
      parkingPolicy: r.parking_policy,
      ferryPolicy: r.ferry_policy,
      driverPolicy: r.driver_policy,
    }));
  } catch {
    return buildDefaultCatalog().filter((r) => r.priceLayer === priceLayer);
  }
}
