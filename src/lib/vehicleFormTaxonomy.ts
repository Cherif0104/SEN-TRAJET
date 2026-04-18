/**
 * Plages de places et libellés alignés sur `vehicle_category_profiles` / migration 202604170004.
 * Formulaire chauffeur : type de carrosserie + classe de service (document produit).
 */

import type { VehicleTypeFilter } from "@/lib/vehicleCategories";
import { VEHICLE_TYPE_VALUES } from "@/lib/vehicleCategories";

export const SERVICE_CLASS_VALUES = [
  "eco",
  "confort",
  "confort_plus",
  "premium",
  "premium_plus",
] as const;

export type ServiceClassLevel = (typeof SERVICE_CLASS_VALUES)[number];

export const SERVICE_CLASS_LABELS: Record<ServiceClassLevel, string> = {
  eco: "Éco",
  confort: "Confort",
  confort_plus: "Confort+",
  premium: "Premium",
  premium_plus: "Premium+ (VIP)",
};

/** Année minimum indicative (rappel chauffeur ; validation métier côté back-office) */
export const SERVICE_CLASS_MIN_YEAR: Record<ServiceClassLevel, number> = {
  eco: 2010,
  confort: 2015,
  confort_plus: 2018,
  premium: 2020,
  premium_plus: 2022,
};

export type SeatBounds = { min: number; max: number };

/** Places totales véhicule (y compris chauffeur), cohérentes avec les contraintes location / taxonomie SQL. */
export const TRANSPORT_SEAT_BOUNDS: Record<VehicleTypeFilter, SeatBounds> = {
  citadine: { min: 1, max: 4 },
  suv_berline: { min: 4, max: 6 },
  familiale: { min: 5, max: 7 },
  minivan: { min: 7, max: 15 },
  minibus: { min: 16, max: 30 },
  bus: { min: 30, max: 60 },
};

export function seatOptionsForTransport(t: VehicleTypeFilter): number[] {
  const { min, max } = TRANSPORT_SEAT_BOUNDS[t];
  const out: number[] = [];
  for (let n = min; n <= max; n += 1) out.push(n);
  return out;
}

/** Emplacements photos véhicule (angles + intérieur + plaques lisibles). */
export const VEHICLE_PHOTO_SLOTS = [
  { key: "exterior_front", label: "Face avant", hint: "Plaque avant lisible" },
  { key: "exterior_rear", label: "Face arrière", hint: "Plaque arrière lisible" },
  { key: "side_driver", label: "Profil côté conducteur" },
  { key: "side_passenger", label: "Profil côté passager" },
  { key: "interior_front", label: "Habitacle avant" },
  { key: "interior_rear_seats", label: "Sièges arrière" },
  { key: "trunk_open", label: "Coffre (ouvert si possible)" },
  { key: "dashboard_odometer", label: "Tableau de bord / kilométrage (facultatif)" },
] as const;

export type VehiclePhotoSlotKey = (typeof VEHICLE_PHOTO_SLOTS)[number]["key"];

export const OTHER_BRAND_SENTINEL = "__AUTRE__";
export const OTHER_MODEL_SENTINEL = "__AUTRE_MODELE__";

export function deriveLegacyVehicleCategory(
  utilitaire: boolean,
  serviceClass: ServiceClassLevel
): "standard" | "confort" | "premium" | "utilitaire" {
  if (utilitaire) return "utilitaire";
  if (serviceClass === "eco") return "standard";
  if (serviceClass === "confort") return "confort";
  return "premium";
}

export function serviceClassFromLegacyCategory(
  c: string | undefined
): ServiceClassLevel {
  if (c === "standard") return "eco";
  if (c === "confort") return "confort";
  if (c === "premium") return "confort_plus";
  if (c === "utilitaire") return "eco";
  return "eco";
}

export function inferTransportFromSeats(seats: number): VehicleTypeFilter {
  const n = Math.round(Number(seats));
  if (!Number.isFinite(n) || n < 1) return "citadine";
  if (n <= 4) return "citadine";
  if (n <= 6) return "suv_berline";
  if (n <= 7) return "familiale";
  if (n <= 15) return "minivan";
  if (n <= 30) return "minibus";
  return "bus";
}

export function isVehicleTypeFilterString(v: string): v is VehicleTypeFilter {
  return (VEHICLE_TYPE_VALUES as readonly string[]).includes(v);
}
