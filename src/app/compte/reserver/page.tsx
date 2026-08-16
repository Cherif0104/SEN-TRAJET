import { redirect } from "next/navigation";

/** Même simulation multi-étapes que le parcours public */
export default function CompteReserverRedirectPage() {
  redirect("/reserver?resume=1");
}
