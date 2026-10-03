"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LogIn, ShieldCheck, UserPlus } from "lucide-react";

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
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-x-0 top-0 h-[48vh]">
        <Image
          src="/images/hero-sen-trajet.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-75"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111f]/15 via-[#07111f]/30 to-[#07111f]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-8 sm:mx-auto sm:w-full sm:max-w-md sm:px-0">
        {step === "welcome" ? (
          <div className="flex flex-col">
            <Image
              src="/brand/sentrajet-wordmark-light.svg"
              alt="SentraJet Premium"
              width={200}
              height={48}
              priority
              unoptimized
              className="h-10 w-auto self-start"
            />
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#f0c86b]">
              Bienvenue au Sénégal en mouvement
            </p>
            <h1 className="mt-3 max-w-sm font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white">
              Tous vos trajets, dans une seule application.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Aéroport, chauffeur privé, location et Allo Dakar : organisez votre mobilité simplement.
            </p>
            <button
              type="button"
              onClick={() => setStep("auth-choice")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f0c86b] px-6 py-4 text-sm font-extrabold text-[#07111f] transition hover:bg-[#f5d583]"
            >
              Commencer
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-center text-xs font-semibold text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Explorer sans compte
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#f0c86b]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white">
              Comment souhaitez-vous continuer ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Connectez-vous pour retrouver vos réservations, suivre votre chauffeur et bénéficier de vos avantages.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3">
              <Link
                href="/connexion"
                onClick={dismiss}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#f0c86b] px-6 py-4 text-sm font-extrabold text-[#07111f] transition hover:bg-[#f5d583]"
              >
                <LogIn className="h-4 w-4" />
                J’ai déjà un compte
              </Link>
              <Link
                href="/inscription"
                onClick={dismiss}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </Link>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-4 text-center text-xs font-semibold text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Continuer sans compte
            </button>
          </div>
        )}
        <div className="mt-7 flex gap-1.5">
          <span className={`h-1.5 rounded-full transition-all ${step === "welcome" ? "w-8 bg-[#f0c86b]" : "w-3 bg-white/20"}`} />
          <span className={`h-1.5 rounded-full transition-all ${step === "auth-choice" ? "w-8 bg-[#f0c86b]" : "w-3 bg-white/20"}`} />
        </div>
      </div>
    </div>
  );
}
