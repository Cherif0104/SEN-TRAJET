import type { Place, ServiceType } from "@/lib/types";

export const RIDE_DRAFT_KEY = "sentrajet:client-ride-draft:v1";

export type ClientRideDraft = {
  pickup: Place;
  destination: Place;
  route: {
    distanceKm: number;
    durationMinutes: number;
    geometry?: number[][];
  };
  service: ServiceType;
  savedAt: string;
};

export function saveRideDraft(draft: ClientRideDraft) {
  window.sessionStorage.setItem(RIDE_DRAFT_KEY, JSON.stringify(draft));
}

export function readRideDraft(): ClientRideDraft | null {
  try {
    const raw = window.sessionStorage.getItem(RIDE_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ClientRideDraft;
    if (
      !draft.pickup
      || !draft.destination
      || !draft.route
      || !Number.isFinite(draft.route.distanceKm)
      || !Number.isFinite(draft.route.durationMinutes)
    ) return null;
    return draft;
  } catch {
    return null;
  }
}
