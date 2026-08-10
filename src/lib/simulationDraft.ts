import type { ServiceType } from "@/lib/sentrajetPricing";

export const SIM_DRAFT_KEY = "sentrajet_sim_draft_v1";

export type SimulationDraft = {
  step: "service" | "trajet" | "prix" | "compte" | "confirm" | "done";
  serviceType: ServiceType;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  passengers: number;
  distanceKm: number | null;
  isRoundTrip: boolean;
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
    pickup: "",
    dropoff: "",
    date: "",
    time: "",
    passengers: 2,
    distanceKm: null,
    isRoundTrip: false,
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
    return parsed;
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
    /* ignore quota */
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
