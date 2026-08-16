import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Plane, MapPin, Clock, Wallet, MessageCircle, BadgeCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Comment ça marche — SentraJet Premium",
  description:
    "Simulez, réservez, payez via Wave : SentraJet traite votre demande et assigne un véhicule de sa flotte.",
};

export default function CommentCaMarchePage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Comment ça marche
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          SentraJet Premium n’est pas une marketplace. Vous faites une demande ; l’entreprise valide,
          envoie le devis / le lien de paiement, puis assigne un véhicule de sa flotte le jour J.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <Plane className="h-5 w-5" />
              <h2 className="text-lg font-bold text-neutral-900">Transfert AIBD</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Indiquez votre départ (ou utilisez votre position), destination AIBD, passagers. Prix
              forfaitaire selon le nombre de places.
            </p>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <MapPin className="h-5 w-5" />
              <h2 className="text-lg font-bold text-neutral-900">Voyage interurbain</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Facturation au kilomètre (850 F client, 700 F partenaire B2B) avec minimum 30 000 F.
            </p>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" />
              <h2 className="text-lg font-bold text-neutral-900">Mise à disposition</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Matinée 50 000 F jusqu’à 100 km ; au-delà, facturation au km.
            </p>
          </section>
        </div>

        <ol className="mt-12 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <li className="flex gap-3 text-sm text-neutral-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              1
            </span>
            <span>
              <strong className="text-neutral-900">Simulez</strong> sur{" "}
              <Link href="/reserver" className="font-semibold text-amber-800 underline">
                /reserver
              </Link>{" "}
              — tarif client. Créez un compte pour −10 %.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              2
            </span>
            <span>
              <strong className="text-neutral-900">Envoyez la demande</strong> — confirmation + bouton
              WhatsApp pour le suivi.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              3
            </span>
            <span className="inline-flex flex-wrap items-center gap-1">
              <Wallet className="h-4 w-4 text-amber-700" />
              <strong className="text-neutral-900">Payez via Wave</strong> après validation SentraJet.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              4
            </span>
            <span className="inline-flex flex-wrap items-center gap-1">
              <BadgeCheck className="h-4 w-4 text-amber-700" />
              Le jour J, un véhicule de la flotte est assigné. Suivi{" "}
              <MessageCircle className="h-4 w-4 text-amber-700" /> WhatsApp + plateforme.
            </span>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/reserver" className="bg-amber-500 text-neutral-900 hover:bg-amber-400">
            Simuler & réserver
          </Button>
          <Button variant="outline" href="/partenaire/onboarding">
            Espace partenaire B2B
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
