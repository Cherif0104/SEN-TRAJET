import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "CGV & règles de réservation — SentraJet Premium",
  description:
    "Projet de conditions générales de vente et règles de réservation SentraJet Premium (brouillon opérationnel).",
};

export default function CguPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Conditions générales de vente & règles de réservation
        </h1>
        <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Brouillon opérationnel</strong> — à faire relire et valider juridiquement avant
          publication définitive. Cadre sénégalais notamment : loi n°2021-25 (prix & protection du
          consommateur) et loi n°2008-08 (transactions électroniques).
        </p>

        <div className="mt-8 space-y-6 text-sm text-neutral-700">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">1. Présentation</h2>
            <p className="mt-2">
              SentraJet Premium est un service sénégalais de transport privé avec chauffeur
              (transferts aéroport, interurbain, mise à disposition, groupes, VIP, etc.).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">2. Espaces</h2>
            <p className="mt-2">
              Client, Chauffeur, Partenaire B2B, Propriétaire/Investisseur (Vehicle Partner), et
              Control Center SentraJet.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">3. Réservation</h2>
            <p className="mt-2">
              Demande → Calcul tarif → Validation → Paiement (Wave) → Confirmation → Affectation
              chauffeur → Prise en charge → Clôture. Une réservation n’est confirmée qu’après
              validation selon les règles SentraJet.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">4. Annulation</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Plus de 6 h avant : sans frais</li>
              <li>Entre 4 h et 6 h : 30 %</li>
              <li>Moins de 2 h : 50 %</li>
              <li>Tranche 2 h–4 h : décision métier ouverte (non inventée)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">5. Attente</h2>
            <p className="mt-2">30 minutes gratuites, puis 2 500 FCFA par tranche de 30 minutes.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">6. Tarifs (extrait)</h2>
            <p className="mt-2">
              AIBD client : 25 000 à 50 000 FCFA selon passagers. AIBD+retour : 35 000 à 60 000 FCFA.
              Interurbain : 850 FCFA/km (min. 30 000). Partenaire : grilles B2B dédiées (700 FCFA/km).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">7. Vehicle Partner</h2>
            <p className="mt-2">
              Contrat d’exploitation à partir de 500 000 FCFA/mois selon véhicule et modalités —
              présentation contractuelle, pas un rendement garanti.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Document complet</h2>
            <p className="mt-2">
              Le cadre opérationnel détaillé (statuts, process, données personnelles, réclamations,
              force majeure) est maintenu dans le dépôt :{" "}
              <code className="text-xs bg-neutral-100 px-1 rounded">
                docs/operations/CGV_REGLES_RESERVATION.md
              </code>
              . Architecture moteurs :{" "}
              <Link href="/admin/regles" className="text-primary underline">
                Control Center — Règles métier
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
