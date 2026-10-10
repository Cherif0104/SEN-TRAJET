import type { RideClass, ServiceType } from "@/lib/types";

export const RIDE_CLASSES: Record<
  RideClass,
  { label: string; description: string; ratePerKm: number; minimum: number; vehicle: string }
> = {
  eco: {
    label: "Éco",
    description: "Citadine · 4 places",
    ratePerKm: 118,
    minimum: 1000,
    vehicle: "Citadine"
  },
  comfort: {
    label: "Comfort",
    description: "Berline climatisée · 4 places",
    ratePerKm: 180,
    minimum: 1000,
    vehicle: "Berline"
  },
  comfort_plus: {
    label: "Comfort Plus",
    description: "Berline récente ou SUV · 6 places",
    ratePerKm: 240,
    minimum: 1500,
    vehicle: "Berline / SUV"
  },
  vip: {
    label: "VIP",
    description: "Véhicule premium · accueil dédié",
    ratePerKm: 380,
    minimum: 3000,
    vehicle: "Premium"
  }
};

export function calculateFare(input: {
  distanceKm: number;
  durationMinutes: number;
  rideClass: RideClass;
  serviceType: ServiceType;
  scheduledFor?: Date | null;
}) {
  const rule = RIDE_CLASSES[input.rideClass];
  const includedKm = input.rideClass === "eco" ? 1.1 : 0;
  const distancePart = Math.max(0, input.distanceKm - includedKm) * rule.ratePerKm;
  const minuteRate = input.rideClass === "eco" ? 30 : 22;
  const includedMinutes = input.rideClass === "eco" ? 4 : 0;
  const timePart = Math.max(0, input.durationMinutes - includedMinutes) * minuteRate;
  const airportFee = input.serviceType === "airport" ? 5000 : 0;
  const sharedAdjustment = input.serviceType === "carpool" ? -Math.min((distancePart + timePart) * 0.25, 4000) : 0;
  const date = input.scheduledFor || new Date();
  const hour = date.getHours();
  const nightFee = hour >= 22 || hour < 6 ? Math.max(1000, (distancePart + timePart) * 0.2) : 0;
  const raw = Math.max(rule.minimum, rule.minimum + distancePart + timePart + airportFee + sharedAdjustment + nightFee);
  const total = Math.ceil(raw / 100) * 100;

  return {
    total,
    minimum: rule.minimum,
    distancePart: Math.round(distancePart),
    timePart: Math.round(timePart),
    airportFee,
    sharedAdjustment: Math.round(sharedAdjustment),
    nightFee: Math.round(nightFee),
    currency: "XOF"
  };
}

export function formatFare(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}
