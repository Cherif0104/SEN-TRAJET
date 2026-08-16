/**
 * Fallbacks charte SentraJet Premium v1.0 (16 août 2026).
 * Les valeurs actives viennent de `pricing_tariff_*` en base ;
 * ce fichier n’est qu’un filet de sécurité hors UI React.
 */

export type PriceLayer = "public" | "partner" | "supplier";
export type FeePolicy = "inclus" | "exclu" | "estime" | "a_confirmer";
export type PricingMode = "per_km" | "forfait" | "forfait_plus_extra_km" | "hourly" | "manual";
export type TariffZone = "any" | "dakar" | "hors_dakar";

export type TariffRule = {
  versionCode: string;
  priceLayer: PriceLayer;
  serviceFamily: string;
  ruleKey: string;
  label: string;
  pricingMode: PricingMode;
  passengersMin: number | null;
  passengersMax: number | null;
  zone: TariffZone;
  basePriceFcfa: number;
  pricePerKmFcfa: number | null;
  includedDistanceKm: number | null;
  includedDurationHours: number | null;
  extraKmPriceFcfa: number | null;
  extraHourPriceFcfa: number | null;
  minimumPriceFcfa: number | null;
  fuelPolicy: FeePolicy;
  tollPolicy: FeePolicy;
  parkingPolicy: FeePolicy;
  ferryPolicy: FeePolicy;
  driverPolicy: FeePolicy;
};

export const CHARTE_VERSION = "1.0";
export const DEFAULT_VEHICLE = {
  type: "van",
  model: "Hyundai Starex",
  capacity: 10,
} as const;

/** Grille publique Hyundai Starex — commerciale SentraJet (pas le coût transporteur). */
export const DEFAULT_PUBLIC_KM_BANDS: Array<{ min: number; max: number; rate: number; key: string }> = [
  { min: 1, max: 4, rate: 800, key: "public_km_1_4" },
  { min: 5, max: 7, rate: 900, key: "public_km_5_7" },
  { min: 8, max: 10, rate: 1200, key: "public_km_8_10" },
];

export const DEFAULT_PUBLIC_MAD_DAKAR = 50_000;
export const DEFAULT_PARTNER_MAD_DAKAR = 40_000;
export const DEFAULT_PARTNER_MAD_HORS_DAKAR_BASE = 60_000;
export const DEFAULT_PARTNER_MAD_INCLUDED_KM = 100;
export const DEFAULT_PARTNER_MAD_EXTRA_KM = 600;
export const DEFAULT_PARTNER_INTERURBAIN_KM = 700;
export const DEFAULT_PARTNER_INTERURBAIN_MIN = 30_000;
export const DEFAULT_PUBLIC_SHORT_TRIP_MIN = 20_000;
export const DEFAULT_SHORT_TRIP_KM = 45;
export const DEFAULT_ROUNDING_STEP = 100;

export function buildDefaultCatalog(): TariffRule[] {
  const publicRules: TariffRule[] = DEFAULT_PUBLIC_KM_BANDS.map((b) => ({
    versionCode: "HYUNDAI_STAREX_PUBLIC_V1",
    priceLayer: "public",
    serviceFamily: "trajet",
    ruleKey: b.key,
    label: `Public ${b.min}–${b.max} passagers`,
    pricingMode: "per_km",
    passengersMin: b.min,
    passengersMax: b.max,
    zone: "any",
    basePriceFcfa: 0,
    pricePerKmFcfa: b.rate,
    includedDistanceKm: null,
    includedDurationHours: null,
    extraKmPriceFcfa: null,
    extraHourPriceFcfa: null,
    minimumPriceFcfa: 0,
    fuelPolicy: "exclu",
    tollPolicy: "exclu",
    parkingPolicy: "exclu",
    ferryPolicy: "exclu",
    driverPolicy: "inclus",
  }));

  return [
    ...publicRules,
    {
      versionCode: "HYUNDAI_STAREX_PUBLIC_V1",
      priceLayer: "public",
      serviceFamily: "mad",
      ruleKey: "public_mad_dakar",
      label: "MAD public Dakar 10 h",
      pricingMode: "forfait",
      passengersMin: null,
      passengersMax: 10,
      zone: "dakar",
      basePriceFcfa: DEFAULT_PUBLIC_MAD_DAKAR,
      pricePerKmFcfa: null,
      includedDistanceKm: null,
      includedDurationHours: 10,
      extraKmPriceFcfa: null,
      extraHourPriceFcfa: null,
      minimumPriceFcfa: DEFAULT_PUBLIC_MAD_DAKAR,
      fuelPolicy: "exclu",
      tollPolicy: "exclu",
      parkingPolicy: "exclu",
      ferryPolicy: "exclu",
      driverPolicy: "inclus",
    },
    {
      versionCode: "HYUNDAI_STAREX_PARTNER_V1",
      priceLayer: "partner",
      serviceFamily: "mad",
      ruleKey: "partner_mad_dakar",
      label: "MAD partenaire Dakar 10 h",
      pricingMode: "forfait",
      passengersMin: null,
      passengersMax: 10,
      zone: "dakar",
      basePriceFcfa: DEFAULT_PARTNER_MAD_DAKAR,
      pricePerKmFcfa: null,
      includedDistanceKm: null,
      includedDurationHours: 10,
      extraKmPriceFcfa: null,
      extraHourPriceFcfa: null,
      minimumPriceFcfa: DEFAULT_PARTNER_MAD_DAKAR,
      fuelPolicy: "exclu",
      tollPolicy: "exclu",
      parkingPolicy: "exclu",
      ferryPolicy: "exclu",
      driverPolicy: "inclus",
    },
    {
      versionCode: "HYUNDAI_STAREX_PARTNER_V1",
      priceLayer: "partner",
      serviceFamily: "mad",
      ruleKey: "partner_mad_hors_dakar",
      label: "MAD partenaire hors Dakar",
      pricingMode: "forfait_plus_extra_km",
      passengersMin: null,
      passengersMax: 10,
      zone: "hors_dakar",
      basePriceFcfa: DEFAULT_PARTNER_MAD_HORS_DAKAR_BASE,
      pricePerKmFcfa: null,
      includedDistanceKm: DEFAULT_PARTNER_MAD_INCLUDED_KM,
      includedDurationHours: null,
      extraKmPriceFcfa: DEFAULT_PARTNER_MAD_EXTRA_KM,
      extraHourPriceFcfa: null,
      minimumPriceFcfa: DEFAULT_PARTNER_MAD_HORS_DAKAR_BASE,
      fuelPolicy: "exclu",
      tollPolicy: "exclu",
      parkingPolicy: "exclu",
      ferryPolicy: "exclu",
      driverPolicy: "inclus",
    },
    {
      versionCode: "HYUNDAI_STAREX_PARTNER_V1",
      priceLayer: "partner",
      serviceFamily: "trajet",
      ruleKey: "partner_interurbain_km",
      label: "Partenaire interurbain",
      pricingMode: "per_km",
      passengersMin: null,
      passengersMax: 10,
      zone: "any",
      basePriceFcfa: 0,
      pricePerKmFcfa: DEFAULT_PARTNER_INTERURBAIN_KM,
      includedDistanceKm: null,
      includedDurationHours: null,
      extraKmPriceFcfa: null,
      extraHourPriceFcfa: null,
      minimumPriceFcfa: DEFAULT_PARTNER_INTERURBAIN_MIN,
      fuelPolicy: "exclu",
      tollPolicy: "exclu",
      parkingPolicy: "exclu",
      ferryPolicy: "exclu",
      driverPolicy: "inclus",
    },
  ];
}
