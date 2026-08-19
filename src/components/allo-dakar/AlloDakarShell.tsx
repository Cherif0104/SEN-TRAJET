"use client";

import Link from "next/link";
import { Car } from "lucide-react";

/**
 * Habillage visuel dédié à SentraJet Allo Dakar — volontairement distinct de SentraJet Premium
 * (pas de logo, pas de palette navy/or, pas de navigation vers l'espace Premium) : Allo Dakar est
 * une offre à part, même si elle partage l'infrastructure technique (paiement, notifications).
 */
export function AlloDakarHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1f6b4a]/20 bg-gradient-to-r from-[#1f6b4a] to-[#2f8f63] text-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/allo-dakar" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
            <Car className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold leading-tight">Allo Dakar</span>
            <span className="block text-[10px] font-medium leading-tight text-white/70">by SentraJet</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/allo-dakar/chauffeur" className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
            Chauffeur
          </Link>
          <Link href="/allo-dakar/gestionnaire" className="hidden rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 sm:inline-block">
            Gestionnaire de garage
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AlloDakarFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-neutral-500">
          Allo Dakar est une offre de transport interurbain partagé, opérée par des chauffeurs partenaires
          indépendants et supervisée par SentraJet.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Besoin d’un transfert privé, d’une mise à disposition ou d’un chauffeur dédié ?{" "}
          <Link href="/" className="font-semibold text-[#1f6b4a] underline">
            Découvrez SentraJet Premium
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function AlloDakarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <AlloDakarHeader />
      <main className="flex-1">{children}</main>
      <AlloDakarFooter />
    </div>
  );
}
