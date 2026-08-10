import type { ServiceType, TripMode } from "@/lib/sentrajetPricing";

export const SIM_DRAFT_KEY = "sentrajet_sim_draft_v2";

export type SimulationDraft = {
  step: "service" | "trajet" | "prix" | "compte" | "confirm" | "done";
  serviceType: ServiceType;
  tripMode: TripMode;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  returnTime: string;
  passengers: number;
  luggage: number;
  waitingMinutes: number;
  distanceKm: number | null;
  distanceSource: string | null;
  phone: string;
  flightNumber: string;
  notes: string;
  validatedQuoteFcfa: number | null;
  updatedAt: string;
};

export function emptyDraft(partial?: Partial<SimulationDraft>): SimulationDraft {
  return {
    step: "service",
    serviceType: "transfert_aibd",
    tripMode: "aller_simple",
    pickup: "Dakar",
    dropoff: "",
    date: "",
    time: "",
    returnTime: "",
    passengers: 2,
    luggage: 1,
    waitingMinutes: 0,
    distanceKm: null,
    distanceSource: null,
    phone: "",
    flightNumber: "",
    notes: "",
    validatedQuoteFcfa: null,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

export function loadSimulationDraft(): SimulationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulationDraft;
    if (!parsed?.serviceType) return null;
    return { ...emptyDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function saveSimulationDraft(draft: SimulationDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SIM_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function clearSimulationDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SIM_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function resumeUrl(): string {
  return "/reserver?resume=1";
}
