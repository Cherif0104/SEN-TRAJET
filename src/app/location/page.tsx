import { redirect } from "next/navigation";

/** Ancienne « location » marketplace → mise à disposition entreprise */
export default function LocationRedirectPage() {
  redirect("/reserver");
}
