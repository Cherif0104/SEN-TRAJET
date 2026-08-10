/** Machine à états SentraJet Premium — source de vérité codes statut */

export const BOOKING_STATUSES = [
  "brouillon",
  "demande_recue",
  "demande",
  "info_demandee",
  "devis_envoye",
  "devis_accepte",
  "devis_refuse",
  "en_attente_de_confirmation",
  "en_attente_de_paiement",
  "payee",
  "confirmee",
  "chauffeur_a_assigner",
  "chauffeur_assigne",
  "chauffeur_en_route",
  "chauffeur_arrive",
  "client_pris_en_charge",
  "en_cours",
  "terminee",
  "annulee_client",
  "annulee_sentrajet",
  "no_show",
  "incident",
  "remboursement_en_cours",
  "remboursee",
] as const;

export type BookingStatusCode = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatusCode, string> = {
  brouillon: "Brouillon",
  demande_recue: "Demande reçue",
  demande: "Demande reçue",
  info_demandee: "Informations demandées",
  devis_envoye: "Devis envoyé",
  devis_accepte: "Devis accepté",
  devis_refuse: "Devis refusé",
  en_attente_de_confirmation: "En attente de confirmation",
  en_attente_de_paiement: "En attente de paiement",
  payee: "Payée",
  confirmee: "Confirmée",
  chauffeur_a_assigner: "Chauffeur à assigner",
  chauffeur_assigne: "Chauffeur assigné",
  chauffeur_en_route: "Chauffeur en route",
  chauffeur_arrive: "Chauffeur arrivé",
  client_pris_en_charge: "Client pris en charge",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee_client: "Annulée client",
  annulee_sentrajet: "Annulée SentraJet",
  no_show: "No-show",
  incident: "Incident",
  remboursement_en_cours: "Remboursement en cours",
  remboursee: "Remboursée",
};

/** Compatibilité avec anciens statuts marketplace / ops */
export function normalizeBookingStatus(status: string): string {
  const map: Record<string, BookingStatusCode> = {
    pending_confirmation: "en_attente_de_confirmation",
    a_assigner: "chauffeur_a_assigner",
    en_attente: "en_attente_de_confirmation",
    nouvelle: "demande_recue",
    confirmee: "confirmee",
    en_cours: "en_cours",
    terminee: "terminee",
    annulee: "annulee_client",
    planned: "chauffeur_a_assigner",
    assigned: "chauffeur_assigne",
  };
  return map[status] ?? status;
}

export function bookingStatusLabel(status: string): string {
  const n = normalizeBookingStatus(status);
  return BOOKING_STATUS_LABELS[n as BookingStatusCode] ?? status;
}
