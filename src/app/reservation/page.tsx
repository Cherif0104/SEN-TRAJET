import { redirect } from "next/navigation";

/** Ancien flux marketplace (réserver un trajet publié) → parcours entreprise */
export default function ReservationRedirectPage() {
  redirect("/reserver");
}
