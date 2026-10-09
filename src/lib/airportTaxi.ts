import { roundFcfa } from "@/lib/pricingMath";

export type AirportRideClass = "comfort" | "comfort_plus" | "vip";
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
  { label: string; description: string; multiplier: number; etaLabel: string }
> = {
  comfort: {
    label: "Comfort",
    description: "Berline climatisée · 4 places",
    multiplier: 1,
    etaLabel: "Le meilleur prix",
  },
  comfort_plus: {
    label: "Comfort Plus",
    description: "Berline récente ou SUV · plus d’espace",
    multiplier: 1.25,
    etaLabel: "Plus de confort",
  },
  vip: {
    label: "VIP",
    description: "Véhicule premium · accueil personnalisé",
    multiplier: 1.6,
    etaLabel: "Expérience premium",
  },
};

export function airportClassPrice(baseAmountFcfa: number, rideClass: AirportRideClass): number {
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
