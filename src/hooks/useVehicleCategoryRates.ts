"use client";

import { useEffect, useState } from "react";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import {
  DEFAULT_FLAT_RATE_MAX_KM,
  DEFAULT_VEHICLE_CATEGORY_RATES,
  vehicleCategoryRatesFromRules,
  type VehicleCategoryRates,
} from "@/lib/sentrajetPricing";

/**
 * Tarifs par catégorie de véhicule (Berline/SUV/Van) pour les transferts aéroport, chargés depuis
 * `business_rules` (catégorie "vehicle_pricing") — modifiables sans code côté back-office. Repli
 * sur les valeurs par défaut si la base n'est pas encore configurée ou en cas d'erreur réseau.
 */
export function useVehicleCategoryRates(): {
  rates: VehicleCategoryRates;
  flatRateMaxKm: number;
} {
  const [rates, setRates] = useState<VehicleCategoryRates>(DEFAULT_VEHICLE_CATEGORY_RATES);
  const [flatRateMaxKm, setFlatRateMaxKm] = useState<number>(DEFAULT_FLAT_RATE_MAX_KM);

  useEffect(() => {
    void listBusinessRules("vehicle_pricing")
      .then((rules) => {
        setRates(vehicleCategoryRatesFromRules(rules));
        setFlatRateMaxKm(ruleNumber(rules, "vehicle_pricing", "flat_rate_max_km", DEFAULT_FLAT_RATE_MAX_KM));
      })
      .catch(() => {
        setRates(DEFAULT_VEHICLE_CATEGORY_RATES);
        setFlatRateMaxKm(DEFAULT_FLAT_RATE_MAX_KM);
      });
  }, []);

  return { rates, flatRateMaxKm };
}
