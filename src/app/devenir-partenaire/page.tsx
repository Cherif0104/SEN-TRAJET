import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Devenir partenaire — SentraJet Premium",
  description:
    "Devenez partenaire certifié SentraJet. Aucun compte B2B n’est créé automatiquement : diagnostic puis validation par notre équipe.",
};

const WA =
  "https://wa.me/221788324069?text=" +
  encodeURIComponent(
    "Bonjour SentraJet Premium, je souhaite devenir partenaire (hôtel / conciergerie / agence / entreprise). Merci de me recontacter pour un diagnostic."
  );

export default function DevenirPartenairePage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Partenariat B2B</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-neutral-900">Devenir partenaire</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          SentraJet Premium conserve un <strong>seul CRM maître</strong> en interne. Les partenaires certifiés
          disposent d’un espace limité (simulations, demandes, factures) — pas d’ERP ni de CRM autonome.
        </p>

        <ol className="mt-8 space-y-4 text-sm text-neutral-700">
          <li className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <span className="font-semibold text-neutral-900">1. Contact</span>
            <p className="mt-1 text-neutral-600">WhatsApp ou téléphone — aucun compte n’est créé ici.</p>
          </li>
          <li className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <span className="font-semibold text-neutral-900">2. Diagnostic</span>
            <p className="mt-1 text-neutral-600">
              Hôtel, conciergerie, agence, entreprise (navettes…) — enregistré dans notre back-office.
            </p>
          </li>
          <li className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <span className="font-semibold text-neutral-900">3. Certification</span>
            <p className="mt-1 text-neutral-600">
              Prospect → diagnostic → vérification → contrat → compte partenaire <em>actif</em>.
            </p>
          </li>
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={WA}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f]"
          >
            Contacter sur WhatsApp
          </a>
          <Link
            href="/contact"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-sm font-semibold text-neutral-800"
          >
            Page contact
          </Link>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          Propriétaire de véhicule / investisseur ? Le parcours est distinct (actifs & contrats flotte), également
          sur diagnostic —{" "}
          <a className="underline" href={WA}>
            contactez-nous
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
