"use client";

import Link from "next/link";
import { Car } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * SentraJet Allo Dakar est une rubrique de la plateforme, pas une application à part : même
 * Header/Footer, même identité visuelle que le reste du site (une seule app, un seul design
 * system). Un simple bandeau de contexte (vert, cohérent avec la tuile « Allo Dakar » de
 * l'accueil) rappelle que ce service fonctionne avec des chauffeurs partenaires indépendants et
 * sa propre tarification — sans jamais ressembler à un site différent.
 */
export function AlloDakarContextBar() {
  return (
    <div className="border-b border-emerald-200 bg-emerald-50">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/allo-dakar" className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Car className="h-3.5 w-3.5" />
          </span>
          Covoiturage interurbain · Allo Dakar
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <Link
            href="/allo-dakar/chauffeur"
            className="rounded-full border border-emerald-300 px-3 py-1 transition hover:bg-emerald-100"
          >
            Devenir chauffeur
          </Link>
          <Link
            href="/allo-dakar/gestionnaire"
            className="hidden rounded-full border border-emerald-300 px-3 py-1 transition hover:bg-emerald-100 sm:inline-block"
          >
            Espace antenne
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AlloDakarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <AlloDakarContextBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
