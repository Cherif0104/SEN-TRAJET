import { redirect } from "next/navigation";

/** Ancien marketplace : redirigé vers la réservation entreprise. */
export default function RechercheRedirectPage() {
  redirect("/reserver");
}
