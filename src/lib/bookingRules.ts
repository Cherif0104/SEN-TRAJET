export type PassengerDraft = {
  adultPassengers: number;
  childPassengers: number;
  availableSeats: number;
};

export type BookingDraft = {
  tripId: string;
  clientId: string;
  driverId: string;
  passengers: number;
  totalFcfa: number;
};

export function clampPassengerDraft(draft: PassengerDraft): PassengerDraft {
  const safeSeats = Math.max(1, draft.availableSeats);
  const adults = Math.max(1, Math.min(draft.adultPassengers, safeSeats));
  const maxChildren = Math.max(0, safeSeats - adults);
  const children = Math.max(0, Math.min(draft.childPassengers, maxChildren));
  return {
    adultPassengers: adults,
    childPassengers: children,
    availableSeats: safeSeats,
  };
}

export function computePassengerTotal(adultPassengers: number, childPassengers: number): number {
  return Math.max(1, adultPassengers) + Math.max(0, childPassengers);
}

export function computeBookingTotalFcfa(unitPriceFcfa: number, passengers: number): number {
  return Math.max(0, Math.round(unitPriceFcfa)) * Math.max(1, Math.round(passengers));
}

export function validateBookingDraft(draft: BookingDraft): string | null {
  if (!draft.tripId.trim()) return "Trip manquant pour la réservation.";
  if (!draft.clientId.trim()) return "Client manquant pour la réservation.";
  if (!draft.driverId.trim()) return "Chauffeur manquant pour la réservation.";
  if (!Number.isFinite(draft.passengers) || draft.passengers <= 0) {
    return "Le nombre de passagers doit être supérieur à zéro.";
  }
  if (!Number.isFinite(draft.totalFcfa) || draft.totalFcfa < 0) {
    return "Le total de réservation est invalide.";
  }
  return null;
}
