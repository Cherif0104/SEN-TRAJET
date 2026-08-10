import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Politique de confidentialité — SentraJet Premium",
  description: "Comment SentraJet Premium collecte et utilise vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </p>
        <div className="mt-8 space-y-6 text-sm text-neutral-600">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">1. Responsable du traitement</h2>
            <p className="mt-2">
              SentraJet Premium (Impulcia Afrique) est responsable du traitement des données personnelles
              collectées via la plateforme.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">2. Données collectées</h2>
            <p className="mt-2">
              Identité, coordonnées, données de réservation / devis / paiement, messagerie de suivi, et
              données techniques de connexion nécessaires à la sécurité du service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">3. Finalités</h2>
            <p className="mt-2">
              Gestion des comptes, traitement des demandes de prestation, devis, paiements Wave,
              dispatch interne (véhicule / chauffeur), facturation, CRM, support WhatsApp / plateforme,
              et obligations légales. SentraJet n’est pas une marketplace de mise en relation ouverte.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">4. Base légale et conservation</h2>
            <p className="mt-2">
              Exécution du contrat, consentement lorsque requis, et obligations légales. Conservation
              pendant la durée nécessaire au service puis archivage / suppression selon politique interne.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">5. Vos droits</h2>
            <p className="mt-2">
              Accès, rectification, effacement, limitation et portabilité selon la loi. Contact via la
              page « Nous contacter ».
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">6. Sécurité et partage</h2>
            <p className="mt-2">
              Mesures techniques et organisationnelles adaptées. Partage limité aux prestataires
              (hébergement, paiement, SMS/email) et, le cas échéant, au chauffeur affecté à votre
              mission confirmée.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
