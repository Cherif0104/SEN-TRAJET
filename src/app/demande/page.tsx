import { redirect } from "next/navigation";

/** Ancienne demande ouverte aux chauffeurs : redirigée vers réservation entreprise. */
export default function DemandeRedirectPage() {
  redirect("/reserver");
}
