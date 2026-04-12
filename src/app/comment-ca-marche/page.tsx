import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { MapPin, MessageCircle, Search, UserPlus, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Comment ça marche — SEN TRAJET",
  description:
    "Réserver un trajet, publier une demande, devenir chauffeur ou partenaire : le même parcours que sur l’accueil, expliqué en détail.",
};

export default function CommentCaMarchePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Comment ça marche
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Même logique que sur la page d’accueil : vous cherchez un trajet publié, ou vous lancez une{" "}
          <strong className="font-semibold text-slate-800">demande</strong> pour recevoir des propositions
          de chauffeurs. Budget max et filtres se règlent sur la page{" "}
          <Link href="/recherche" className="font-semibold text-emerald-700 hover:underline">
            Recherche
          </Link>
          .
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 text-emerald-700">
              <Search className="h-5 w-5" />
              <h2 className="text-lg font-bold text-slate-900">Voyageurs (clients)</h2>
            </div>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
              <li>
                Depuis l’<strong className="text-slate-800">accueil</strong> ou{" "}
                <Link href="/recherche" className="font-medium text-emerald-700 hover:underline">
                  Recherche
                </Link>
                : départ, destination, date et heure ; sur Recherche vous pouvez aussi indiquer un{" "}
                <strong className="text-slate-800">budget max</strong> (FCFA).
              </li>
              <li>
                Parcourez les trajets publiés (prix, véhicule, type de trajet) ou ouvrez une{" "}
                <Link href="/demande" className="font-medium text-emerald-700 hover:underline">
                  demande personnalisée
                </Link>{" "}
                si rien ne convient.
              </li>
              <li>Réservez (passagers, point de rencontre) et suivez l’état dans Mon compte.</li>
              <li>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Messagerie liée à la réservation
                </span>{" "}
                et avis après le trajet.
              </li>
            </ol>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 text-emerald-700">
              <MapPin className="h-5 w-5" />
              <h2 className="text-lg font-bold text-slate-900">Demande &amp; propositions</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Pas de trajet qui correspond ? Publiez une{" "}
              <strong className="text-slate-800">demande</strong> (villes, date, créneau, nombre de
              passagers). Les chauffeurs intéressés envoient une <strong className="text-slate-800">proposition</strong>{" "}
              (prix, véhicule). Vous acceptez celle qui vous convient, puis la réservation suit le même
              fil que pour un trajet classique.
            </p>
            <Button variant="outline" size="sm" href="/demande" className="mt-5">
              Publier une demande
            </Button>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 text-emerald-700">
              <UserPlus className="h-5 w-5" />
              <h2 className="text-lg font-bold text-slate-900">Chauffeurs</h2>
            </div>
            <ol className="mt-4 grid list-decimal gap-3 pl-5 text-sm leading-relaxed text-slate-600 sm:grid-cols-2 sm:gap-x-10">
              <li className="pl-1">
                <Link
                  href="/inscription?role=chauffeur"
                  className="font-medium text-emerald-700 hover:underline"
                >
                  Inscription chauffeur
                </Link>{" "}
                : type de véhicule (personnes ou utilitaire), profil et documents.
              </li>
              <li className="pl-1">
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Crédits
                </span>{" "}
                pour publier des trajets et répondre aux demandes (recharge, dont mobile money selon
                configuration).
              </li>
              <li className="pl-1">
                Publiez un trajet ou proposez un prix sur une demande client ; notifications pour rester
                aligné avec le client.
              </li>
              <li className="pl-1">Messagerie et déroulé du trajet jusqu’à la fin de course.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-lg sm:p-8 lg:col-span-2">
            <h2 className="text-lg font-bold">Partenaires (flottes)</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Recrutement de chauffeurs via <strong className="text-white">code d’invitation</strong>,
              suivi des commissions sur recharges et trajets. L’inscription partenaire mène à l’onboarding
              pour compléter la fiche entreprise.
            </p>
            <Button
              variant="secondary"
              size="sm"
              href="/partenaire/onboarding"
              className="mt-5 border-white/40 text-white hover:bg-white/10"
            >
              Espace partenaire
            </Button>
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Questions fréquentes :{" "}
          <Link href="/faq" className="font-semibold text-emerald-700 hover:underline">
            FAQ
          </Link>
          {" · "}
          <Link href="/contact" className="font-semibold text-emerald-700 hover:underline">
            Contact
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
