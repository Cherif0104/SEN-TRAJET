export type RideClass = "comfort" | "comfort_plus" | "vip";
export type RideKind = "city" | "airport";

type RideRate = {
  minimumFcfa: number;
  includedKm: number;
  includedMinutes: number;
  perKmFcfa: number;
  perMinuteFcfa: number;
  seats: number;
};

export const RIDE_CLASS_LABELS: Record<RideClass, string> = {
  comfort: "Comfort",
  comfort_plus: "Comfort Plus",
  vip: "VIP",
};

export const RIDE_CLASS_RATES: Record<RideKind, Record<RideClass, RideRate>> = {
  city: {
    comfort: {
      minimumFcfa: 1_000,
      includedKm: 1,
      includedMinutes: 4,
      perKmFcfa: 130,
      perMinuteFcfa: 30,
      seats: 4,
    },
    comfort_plus: {
      minimumFcfa: 1_500,
      includedKm: 1,
      includedMinutes: 4,
      perKmFcfa: 170,
      perMinuteFcfa: 40,
      seats: 5,
    },
    vip: {
      minimumFcfa: 2_500,
      includedKm: 1,
      includedMinutes: 4,
      perKmFcfa: 230,
      perMinuteFcfa: 55,
      seats: 7,
    },
  },
  airport: {
    comfort: {
      minimumFcfa: 25_000,
      includedKm: 0,
      includedMinutes: 0,
      perKmFcfa: 600,
      perMinuteFcfa: 0,
      seats: 4,
    },
    comfort_plus: {
      minimumFcfa: 30_000,
      includedKm: 0,
      includedMinutes: 0,
      perKmFcfa: 700,
      perMinuteFcfa: 0,
      seats: 5,
    },
    vip: {
      minimumFcfa: 45_000,
      includedKm: 0,
      includedMinutes: 0,
      perKmFcfa: 900,
      perMinuteFcfa: 0,
      seats: 7,
    },
  },
};

function roundUpTo100(value: number): number {
  return Math.ceil(Math.max(0, value) / 100) * 100;
}

export function isNightTariff(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

export type LiveRideQuote = {
  amountFcfa: number;
  daytimeAmountFcfa: number;
  minimumFcfa: number;
  distanceKm: number;
  durationMinutes: number;
  distanceFeeFcfa: number;
  durationFeeFcfa: number;
  trafficFeeFcfa: number;
  nightFeeFcfa: number;
  demandFeeFcfa: number;
  demandMultiplier: number;
  nightApplied: boolean;
  formula: string;
  breakdown: string[];
};

/**
 * Barème live SentraJet.
 *
 * La durée routière transmise doit déjà intégrer le trafic. Le supplément circulation
 * correspond donc uniquement aux minutes au-delà de la durée de référence et n'est jamais
 * remultiplié une seconde fois. La majoration de demande est distincte et plafonnée à 30 %.
 */
export function computeLiveRidePrice(params: {
  distanceKm: number;
  durationMinutes: number;
  baselineDurationMinutes?: number | null;
  rideClass: RideClass;
  rideKind?: RideKind;
  startsAt?: Date;
  demandMultiplier?: number;
}): LiveRideQuote {
  const rideKind = params.rideKind ?? "city";
  const rate = RIDE_CLASS_RATES[rideKind][params.rideClass];
  const distanceKm = Math.max(0, Number(params.distanceKm) || 0);
  const durationMinutes = Math.max(0, Math.round(Number(params.durationMinutes) || 0));
  const baselineDurationMinutes = Math.max(
    0,
    Math.min(durationMinutes, Math.round(Number(params.baselineDurationMinutes) || durationMinutes)),
  );
  const billableKm = Math.max(0, distanceKm - rate.includedKm);
  const billableMinutes = Math.max(0, durationMinutes - rate.includedMinutes);
  const trafficMinutes = Math.max(0, durationMinutes - baselineDurationMinutes);
  const distanceFeeFcfa = Math.round(billableKm * rate.perKmFcfa);
  const durationFeeFcfa = Math.round(billableMinutes * rate.perMinuteFcfa);
  const trafficFeeFcfa = Math.round(trafficMinutes * rate.perMinuteFcfa);

  const meteredAmount =
    rideKind === "airport"
      ? Math.max(rate.minimumFcfa, distanceFeeFcfa)
      : Math.max(rate.minimumFcfa, rate.minimumFcfa + distanceFeeFcfa + durationFeeFcfa);
  const daytimeAmountFcfa = roundUpTo100(meteredAmount);
  const demandMultiplier = Math.min(1.3, Math.max(1, params.demandMultiplier ?? 1));
  const demandFeeFcfa = roundUpTo100(daytimeAmountFcfa * (demandMultiplier - 1));
  const beforeNight = daytimeAmountFcfa + demandFeeFcfa;
  const nightApplied = isNightTariff(params.startsAt ?? new Date());
  const nightFeeFcfa = nightApplied ? roundUpTo100(Math.max(1_000, beforeNight * 0.2)) : 0;
  const amountFcfa = roundUpTo100(beforeNight + nightFeeFcfa);

  const breakdown = [
    `${RIDE_CLASS_LABELS[params.rideClass]} · minimum ${rate.minimumFcfa.toLocaleString("fr-FR")} FCFA`,
    `${distanceKm.toFixed(1)} km · ${durationMinutes} min estimées`,
  ];
  if (trafficFeeFcfa > 0) {
    breakdown.push(
      `Circulation : ${trafficMinutes} min supplémentaires intégrées (${trafficFeeFcfa.toLocaleString("fr-FR")} FCFA)`,
    );
  }
  if (demandFeeFcfa > 0) {
    breakdown.push(`Forte demande : +${Math.round((demandMultiplier - 1) * 100)} %`);
  }
  if (nightFeeFcfa > 0) {
    breakdown.push(`Nuit 22 h–6 h : +${nightFeeFcfa.toLocaleString("fr-FR")} FCFA`);
  }

  return {
    amountFcfa,
    daytimeAmountFcfa,
    minimumFcfa: rate.minimumFcfa,
    distanceKm,
    durationMinutes,
    distanceFeeFcfa,
    durationFeeFcfa,
    trafficFeeFcfa,
    nightFeeFcfa,
    demandFeeFcfa,
    demandMultiplier,
    nightApplied,
    formula: breakdown.join(" · "),
    breakdown,
  };
}
