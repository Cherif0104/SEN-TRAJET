export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "Prise en charge",
  confirmed: "En route",
  completed: "Terminée",
  cancelled: "Annulée",
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
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "completed") return "bg-sky-100 text-sky-800";
  if (status === "cancelled") return "bg-neutral-200 text-neutral-700";
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
  if (status === "pending" || status === "pending_payment") return "bg-amber-100 text-amber-800";
  if (status === "confirmed" || status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "completed") return "bg-sky-100 text-sky-800";
  if (status === "cancelled") return "bg-neutral-200 text-neutral-700";
  return "bg-neutral-100 text-neutral-600";
}
