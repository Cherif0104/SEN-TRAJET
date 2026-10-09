import { redirect } from "next/navigation";

/** Tunnel spécialisé Taxi Aéroport, réservé aux comptes connectés. */
export default function CompteReserverRedirectPage() {
  redirect("/taxi-aeroport");
}
