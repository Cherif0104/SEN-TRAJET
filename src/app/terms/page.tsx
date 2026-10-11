import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function TermsPage() {
  return (
    <main className="mobile-screen legal-blueprint">
      <header className="auth-blueprint-header safe-top">
        <Link href="/signup" aria-label="Retour"><ArrowLeft size={19} /></Link>
        <BrandLogo compact />
        <span />
      </header>
      <article className="legal-blueprint-body safe-bottom">
        <h1>Conditions d’utilisation</h1>
        <section>
          <h2>1. Objet</h2>
          <p>Ces conditions définissent les règles d’utilisation de SentraJet et les relations entre le client, le chauffeur et la plateforme.</p>
        </section>
        <section>
          <h2>2. Inscription</h2>
          <p>L’accès aux services nécessite un compte. L’utilisateur fournit des informations exactes et maintient ses coordonnées à jour.</p>
        </section>
        <section>
          <h2>3. Responsabilités</h2>
          <p>L’utilisateur est responsable de la sécurité de son compte et du respect des règles applicables à chaque service réservé.</p>
        </section>
        <section>
          <h2>4. Données personnelles</h2>
          <p>Les données sont traitées pour fournir le service, sécuriser les trajets et respecter les obligations réglementaires applicables.</p>
        </section>
        <Link className="legal-accept" href="/signup">J’accepte <ArrowRight size={17} /></Link>
      </article>
    </main>
  );
}
