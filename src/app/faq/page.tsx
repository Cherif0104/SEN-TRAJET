import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "FAQ — SEN TRAJET",
  description: "Questions fréquentes sur la réservation de trajets, l’inscription chauffeur et partenaire.",
};

const faqItems = [
  {
    q: "Comment réserver un trajet ?",
    a: "Recherchez un trajet (départ, destination, date), choisissez une offre dans les résultats, puis cliquez sur « Réserver ». Renseignez le nombre de passagers et le point de rencontre, puis validez.",
  },
  {
    q: "Puis-je annuler une réservation ?",
    a: "Oui. Depuis « Mon compte » puis « Mes réservations », vous pouvez annuler une réservation selon les conditions définies (voir CGU). En cas de litige, contactez le support.",
  },
  {
    q: "Comment devenir chauffeur ?",
    a: "Cliquez sur « Devenir Chauffeur » ou « Inscription » et choisissez le rôle Chauffeur. Complétez votre profil (véhicule, documents), rechargez des crédits, puis publiez des trajets ou répondez aux demandes.",
  },
  {
    q: "À quoi servent les crédits chauffeur ?",
    a: "Les crédits permettent de répondre aux demandes des clients et de publier des trajets. Vous les rechargez depuis l’espace chauffeur (Crédits → Recharger).",
  },
  {
    q: "Comment contacter un chauffeur ou un client ?",
    a: "Utilisez la messagerie intégrée : depuis « Messages » ou depuis une réservation, ouvrez la conversation liée au trajet.",
  },
  {
    q: "Comment devenir partenaire ?",
    a: "Inscrivez-vous en tant que partenaire (depuis la landing « Devenir partenaire » ou la page Inscription). Complétez l’onboarding (raison sociale, contact), puis utilisez votre lien d’invitation pour recruter des chauffeurs.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          FAQ
        </h1>
        <p className="mt-2 text-neutral-600 text-sm">
          Réponses aux questions les plus fréquentes sur SEN TRAJET.
        </p>
        <dl className="mt-8 space-y-6">
          {faqItems.map((item) => (
            <div key={item.q}>
              <dt className="text-base font-semibold text-neutral-900">{item.q}</dt>
              <dd className="mt-1 text-sm text-neutral-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </main>
      <Footer />
    </div>
  );
}
