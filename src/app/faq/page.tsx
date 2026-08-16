import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "FAQ — SentraJet Premium",
  description: "Questions fréquentes sur la réservation de prestations SentraJet Premium.",
};

const faqItems = [
  {
    q: "Comment réserver ?",
    a: "Allez sur « Réserver », choisissez le type de prestation (aéroport, voyage, mise à disposition, groupe…), renseignez départ / date / passagers, consultez l’estimation, puis cliquez sur « Demander cette prestation ». SentraJet étudie et vous envoie un devis.",
  },
  {
    q: "Est-ce que je choisis un chauffeur ou un véhicule ?",
    a: "Non. Vous réservez une prestation SentraJet. Après validation et paiement, l’entreprise affecte elle-même le véhicule et le chauffeur adaptés.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Après acceptation du devis, vous payez via Wave. Une fois le paiement confirmé, votre réservation est confirmée et le dispatch peut démarrer.",
  },
  {
    q: "Y a-t-il une réduction avec un compte ?",
    a: "Oui : −10 % sur les tarifs client (selon règles admin). Les tarifs partenaires B2B ne s’appliquent que depuis l’espace partenaire authentifié.",
  },
  {
    q: "Puis-je suivre ma réservation ?",
    a: "Oui, depuis votre espace client et via WhatsApp après confirmation.",
  },
  {
    q: "Comment devenir partenaire B2B ?",
    a: "Via « Devenir partenaire » : contact WhatsApp / téléphone, puis diagnostic et certification par SentraJet. Aucun compte B2B n’est créé automatiquement. L’espace partenaire (simulations, demandes, factures) n’ouvre qu’après statut ACTIF — ce n’est pas un CRM/ERP offert aux partenaires.",
  },
  {
    q: "Comment devenir chauffeur SentraJet ?",
    a: "Les chauffeurs font partie de la flotte entreprise. L’inscription ouverte « marketplace » n’existe plus : le recrutement et l’affectation sont gérés par SentraJet.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">SentraJet Premium</p>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">FAQ</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Réponses aux questions les plus fréquentes sur le nouveau parcours entreprise.
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
