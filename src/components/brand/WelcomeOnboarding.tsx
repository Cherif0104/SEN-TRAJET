"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

export const ONBOARDING_SEEN_KEY = "sentrajet_onboarding_seen_v1";

type Step = "welcome" | "auth-choice";

/**
 * Premier écran interactif à la toute première visite (une seule fois, suivi via localStorage) —
 * logo, message de bienvenue, puis choix « J'ai déjà un compte / Créer un compte », façon
 * app VTC (Yango/Uber) plutôt qu'une simple page de connexion brute. Un lien « Continuer sans
 * compte » reste toujours visible : l'app est utilisable sans inscription (réservation invité,
 * catalogue, destinations…).
 */
export function WelcomeOnboarding({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState<Step>("welcome");

  function dismiss() {
    try {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,63,0.18),transparent_60%)]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        {step === "welcome" ? (
          <div className="flex max-w-sm flex-col items-center text-center">
            <Image
              src="/brand/sentrajet-wordmark-light.svg"
              alt="SentraJet Premium"
              width={220}
              height={53}
              priority
              unoptimized
              className="h-12 w-auto"
            />
            <h1 className="mt-8 font-display text-2xl font-bold tracking-tight">
              Bienvenue sur SentraJet
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Transferts aéroport, mise à disposition, location de véhicules, covoiturage
              interurbain… toute l’offre de transport du Sénégal, dans une seule application.
            </p>
            <button
              type="button"
              onClick={() => setStep("auth-choice")}
              className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4a83f] px-6 py-4 text-sm font-bold text-[#07111f] transition hover:bg-[#e8bd55]"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-4 text-xs font-semibold text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Continuer sans compte
            </button>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Avez-vous déjà un compte ?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Un compte client donne −10 % sur chaque réservation et un suivi en temps réel.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3">
              <Link
                href="/connexion"
                onClick={dismiss}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#d4a83f] px-6 py-4 text-sm font-bold text-[#07111f] transition hover:bg-[#e8bd55]"
              >
                <LogIn className="h-4 w-4" />
                J’ai déjà un compte
              </Link>
              <Link
                href="/inscription"
                onClick={dismiss}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </Link>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-5 text-xs font-semibold text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Continuer sans compte
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 flex justify-center gap-1.5 pb-8">
        <span className={`h-1.5 w-6 rounded-full ${step === "welcome" ? "bg-[#d4a83f]" : "bg-white/20"}`} />
        <span className={`h-1.5 w-6 rounded-full ${step === "auth-choice" ? "bg-[#d4a83f]" : "bg-white/20"}`} />
      </div>
    </div>
  );
}
