/**
 * Types et plages de places (total véhicule, chauffeur inclus selon données trajets / annonces).
 * Aligné sur la nomenclature produit (citadine, SUV/berline, familiale, minivan, minibus, bus).
 */

export const VEHICLE_TYPE_VALUES = [
  "citadine",
  "suv_berline",
  "familiale",
  "minivan",
  "minibus",
  "bus",
] as const;

export type VehicleTypeFilter = (typeof VEHICLE_TYPE_VALUES)[number];

export function isVehicleTypeFilter(v: string): v is VehicleTypeFilter {
  return (VEHICLE_TYPE_VALUES as readonly string[]).includes(v);
}

/** Libellés courts pour formulaires compacts */
export const VEHICLE_TYPE_META: Record<
  VehicleTypeFilter,
  { label: string; description: string }
> = {
  citadine: { label: "Citadine", description: "Jusqu’à 5 places · ville / compact" },
  suv_berline: { label: "SUV / Berline", description: "6–7 places · confort route" },
  familiale: { label: "Familiale", description: "8–9 places · break / grand SUV" },
  minivan: { label: "Minivan", description: "10–15 places · groupes" },
  minibus: { label: "Minibus", description: "16–30 places · collectif" },
  bus: { label: "Bus", description: "31 places et + · longue distance" },
};

/**
 * Filtre recherche trajets par capacité (`total_seats` côté base).
 * Plages disjointes pour éviter les doublons dans les résultats.
 */
export function matchesVehicleTypeBand(totalSeats: number, vehicleType: VehicleTypeFilter): boolean {
  const n = Math.round(Number(totalSeats));
  if (!Number.isFinite(n) || n < 1) return false;
  switch (vehicleType) {
    case "citadine":
      return n <= 5;
    case "suv_berline":
      return n >= 6 && n <= 7;
    case "familiale":
      return n >= 8 && n <= 9;
    case "minivan":
      return n >= 10 && n <= 15;
    case "minibus":
      return n >= 16 && n <= 30;
    case "bus":
      return n >= 31;
    default:
      return true;
  }
}
