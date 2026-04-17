import type { PickupMode } from "@/lib/pricing";

export type TripSearchInput = {
  depart: string;
  destination: string;
  date?: string;
  budget?: string;
  pickupMode: PickupMode;
};

export type ValidatedTripSearch = {
  depart: string;
  destination: string;
  date?: string;
  budgetFcfa?: number;
  pickupMode: PickupMode;
};

export function parseBudgetFcfa(rawBudget?: string): number | undefined {
  if (!rawBudget?.trim()) return undefined;
  const parsed = Number.parseInt(rawBudget, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function validateTripSearchInput(input: TripSearchInput):
  | { ok: true; value: ValidatedTripSearch }
  | { ok: false; message: string } {
  const depart = input.depart.trim();
  const destination = input.destination.trim();
  if (!depart || !destination) {
    return { ok: false, message: "Renseignez le départ et la destination pour lancer la recherche." };
  }
  if (depart.toLowerCase() === destination.toLowerCase()) {
    return { ok: false, message: "Le départ et la destination doivent être différents." };
  }
  const budgetFcfa = parseBudgetFcfa(input.budget);
  return {
    ok: true,
    value: {
      depart,
      destination,
      ...(input.date ? { date: input.date } : {}),
      ...(budgetFcfa ? { budgetFcfa } : {}),
      pickupMode: input.pickupMode,
    },
  };
}

export function buildTripSearchQueryString(input: ValidatedTripSearch): string {
  const params = new URLSearchParams();
  params.set("depart", input.depart);
  params.set("destination", input.destination);
  params.set("pickupMode", input.pickupMode);
  if (input.date) params.set("date", input.date);
  if (input.budgetFcfa) params.set("budget", String(input.budgetFcfa));
  return params.toString();
}
