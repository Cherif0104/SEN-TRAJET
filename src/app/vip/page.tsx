import { redirect } from "next/navigation";

/**
 * L'ancienne mise à disposition n'est plus une offre autonome.
 * VIP est désormais une classe sélectionnable dans le parcours Course privée.
 */
export default function LegacyVipRedirect() {
  redirect("/course?class=vip");
}
