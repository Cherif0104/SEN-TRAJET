import { roundFcfa } from "@/lib/pricingMath";

export type AirportRideClass = "economy" | "comfort" | "comfort_plus" | "vip";
export type AirportBookingMode = "now" | "scheduled";
export type AirportDirection = "to_airport" | "from_airport";

export const AIRPORT_PLACE = {
  id: "seed:aibd",
  label: "Aéroport AIBD",
  address: "Aéroport International Blaise Diagne (AIBD), Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669,
  source: "reference",
} as const;

export const AIRPORT_RIDE_CLASSES: Record<
  AirportRideClass,
  { label: string; description: string; multiplier: number; etaLabel: string; maxPassengers: number }
> = {
  economy: {
    label: "Éco",
    description: "Citadine climatisée · prix accessible",
    multiplier: 0,
    etaLabel: "Le plus économique",
    maxPassengers: 4,
  },
  comfort: {
    label: "Comfort",
    description: "Berline climatisée · 4 places",
    multiplier: 1,
    etaLabel: "Le meilleur prix",
    maxPassengers: 4,
  },
  comfort_plus: {
    label: "Comfort Plus",
    description: "Berline récente ou SUV · plus d’espace",
    multiplier: 1.25,
    etaLabel: "Plus de confort",
    maxPassengers: 7,
  },
  vip: {
    label: "VIP",
    description: "Véhicule premium · accueil personnalisé",
    multiplier: 1.6,
    etaLabel: "Expérience premium",
    maxPassengers: 4,
  },
};

/**
 * Référence publique Yango Dakar consultée le 9 octobre 2026 :
 * 570 FCFA minimum, 1,1 km inclus, puis 118 FCFA/km.
 * Source : https://yango.com/fr_sn/rider/
 *
 * Cette formule est une référence de marché SentraJet, sans affiliation à Yango.
 */
export function economyReferencePrice(distanceKm: number): number {
  const minimumFcfa = 570;
  const includedKm = 1.1;
  const additionalKmRateFcfa = 118;
  const raw = minimumFcfa + Math.max(0, distanceKm - includedKm) * additionalKmRateFcfa;
  return Math.max(minimumFcfa, Math.ceil(raw / 100) * 100);
}

export function airportClassPrice(
  baseAmountFcfa: number,
  rideClass: AirportRideClass,
  distanceKm = 0
): number {
  if (rideClass === "economy") return economyReferencePrice(distanceKm);
  return roundFcfa(Math.max(0, baseAmountFcfa) * AIRPORT_RIDE_CLASSES[rideClass].multiplier);
}

export function airportPickupTime(
  mode: AirportBookingMode,
  date: string,
  time: string,
  now = new Date()
): Date | null {
  if (mode === "now") return new Date(now.getTime() + 5 * 60_000);
  if (!date || !time) return null;
  const scheduled = new Date(`${date}T${time}:00`);
  return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}
