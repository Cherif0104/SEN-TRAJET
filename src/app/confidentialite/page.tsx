import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Politique de confidentialité — SEN TRAJET",
  description: "Comment SEN TRAJET collecte et utilise vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <div className="flex min-h-screen flex-col">
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
              SEN TRAJET est le responsable du traitement des données personnelles collectées via la plateforme (site et applications associées).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">2. Données collectées</h2>
            <p className="mt-2">
              Nous collectons les données nécessaires au service : identité (nom, prénom), coordonnées (email, téléphone), informations de profil (rôle, véhicule pour les chauffeurs), données de réservation et de messagerie, et données de connexion (adresse IP, logs) dans le cadre de la sécurité et du bon fonctionnement du service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">3. Finalités</h2>
            <p className="mt-2">
              Les données sont utilisées pour : la création et la gestion du compte, la mise en relation clients/chauffeurs, le traitement des réservations et des paiements (crédits), la messagerie, le suivi des trajets, le respect des obligations légales et la prévention des abus.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">4. Base légale et conservation</h2>
            <p className="mt-2">
              Le traitement repose sur l’exécution du contrat (utilisation du service), le consentement lorsque requis (communications, cookies), et les obligations légales. Les données sont conservées pendant la durée nécessaire au service et aux obligations légales, puis archivées ou supprimées selon la politique en vigueur.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">5. Vos droits</h2>
            <p className="mt-2">
              Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation du traitement et de portabilité dans les conditions prévues par la loi. Vous pouvez exercer ces droits en nous contactant (page « Nous contacter »). Vous avez également le droit d’introduire une réclamation auprès de l’autorité de contrôle compétente.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">6. Sécurité et partage</h2>
            <p className="mt-2">
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données. Les données peuvent être partagées avec des prestataires (hébergement, paiement, envoi de SMS/emails) dans le cadre strict du service, et avec les autres utilisateurs concernés (ex. chauffeur/client pour un trajet) selon les fonctionnalités utilisées.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
