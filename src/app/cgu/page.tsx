import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Conditions générales d’utilisation — SEN TRAJET",
  description: "CGU de la plateforme SEN TRAJET.",
};

export default function CguPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Conditions générales d’utilisation
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </p>
        <div className="mt-8 space-y-6 text-sm text-neutral-600">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">1. Objet</h2>
            <p className="mt-2">
              Les présentes conditions générales d’utilisation (CGU) régissent l’accès et l’utilisation de la plateforme SEN TRAJET, service de mise en relation pour le transport interurbain et l’envoi de colis au Sénégal.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">2. Acceptation</h2>
            <p className="mt-2">
              L’utilisation de la plateforme implique l’acceptation sans réserve des présentes CGU. En cas de désaccord, l’utilisateur s’abstient d’utiliser le service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">3. Rôles et responsabilités</h2>
            <p className="mt-2">
              SEN TRAJET met en relation des clients (voyageurs) et des chauffeurs ou partenaires. La plateforme ne assure pas le transport ; les chauffeurs sont responsables de l’exécution des trajets et du respect de la réglementation en vigueur.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">4. Réservations et annulations</h2>
            <p className="mt-2">
              Les conditions d’annulation et de remboursement sont communiquées au moment de la réservation. En cas d’annulation par le client ou le chauffeur, les règles applicables sont celles affichées sur la plateforme et dans l’espace compte.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">5. Données personnelles</h2>
            <p className="mt-2">
              Le traitement des données personnelles est décrit dans la politique de confidentialité. En utilisant SEN TRAJET, vous acceptez ce traitement dans le cadre du service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">6. Contact</h2>
            <p className="mt-2">
              Pour toute question relative aux CGU : utilisez la page « Nous contacter » ou les coordonnées indiquées sur la plateforme.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
