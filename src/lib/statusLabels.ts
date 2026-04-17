export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  in_progress: "En route",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const BOOKING_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "Ouverte",
  matched: "Proposition reçue",
  cancelled: "Annulée",
  expired: "Expirée",
};

export const RENTAL_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmée",
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export function bookingStatusStyle(status: string) {
  if (status === "pending") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (status === "in_progress") return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (status === "completed") return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
  if (status === "cancelled") return "bg-neutral-200 text-neutral-700 ring-1 ring-neutral-300";
  return "bg-neutral-100 text-neutral-600";
}

export function requestStatusStyle(status: string) {
  if (status === "open") return "bg-emerald-100 text-emerald-800";
  if (status === "matched") return "bg-sky-100 text-sky-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  if (status === "cancelled") return "bg-neutral-200 text-neutral-700";
  return "bg-neutral-100 text-neutral-600";
}

export function rentalStatusStyle(status: string) {
  if (status === "pending" || status === "pending_payment") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (status === "confirmed" || status === "active") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (status === "completed") return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
  if (status === "cancelled") return "bg-neutral-200 text-neutral-700 ring-1 ring-neutral-300";
  return "bg-neutral-100 text-neutral-600";
}

export function canTransitionBookingStatus(current: string, next: string): boolean {
  return (BOOKING_STATUS_TRANSITIONS[current] ?? []).includes(next);
}
