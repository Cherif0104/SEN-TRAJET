"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CarFront, Download, MapPinned, Plane, ShieldCheck } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const slides = [
  {
    eyebrow: "Taxi Aéroport Sénégal",
    title: "AIBD, simplement.",
    description: "Votre adresse, votre véhicule et votre tarif dans une expérience 100 % mobile.",
    icon: Plane,
  },
  {
    eyebrow: "Course en direct",
    title: "Un chauffeur vérifié.",
    description: "Réservez maintenant ou planifiez votre départ et suivez chaque étape depuis l’application.",
    icon: MapPinned,
  },
  {
    eyebrow: "À chacun son confort",
    title: "Éco à VIP.",
    description: "Choisissez le niveau de service adapté à votre budget, avec le prix affiché avant confirmation.",
    icon: CarFront,
  },
];

export function AppOnboarding() {
  const [splash, setSplash] = useState(true);
  const [slide, setSlide] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1200);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (splash) {
    return (
      <main className="grid min-h-screen place-items-center overflow-hidden bg-[#07111f] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto grid h-24 w-24 animate-[pulse_1.2s_ease-in-out_infinite] place-items-center rounded-[30px] bg-gradient-to-br from-[#f0c86b] to-[#b77c24] text-[#07111f] shadow-[0_24px_70px_-20px_rgba(240,200,107,.65)]">
            <Plane className="h-11 w-11" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold tracking-[0.08em]">SENTRAJET</h1>
          <p className="mt-1 text-xs font-bold tracking-[0.3em] text-amber-300">TAXI AÉROPORT</p>
        </div>
      </main>
    );
  }

  const current = slides[slide];
  const Icon = current.icon;
  const last = slide === slides.length - 1;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-extrabold tracking-[0.1em]">SENTRAJET</p>
            <p className="text-[9px] font-bold tracking-[0.24em] text-amber-300">TAXI AÉROPORT</p>
          </div>
          {installPrompt ? (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-3 text-xs font-bold text-white"
            >
              <Download className="h-4 w-4 text-amber-300" />
              Installer
            </button>
          ) : null}
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="relative mx-auto grid aspect-square w-full max-w-[330px] place-items-center overflow-hidden rounded-[42px] border border-white/10 bg-gradient-to-br from-[#142b48] to-[#091522]">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative grid h-28 w-28 place-items-center rounded-[34px] border border-amber-200/20 bg-amber-300/10 text-amber-300">
              <Icon className="h-14 w-14" />
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#07111f]/80 px-4 py-3 text-xs text-slate-300 backdrop-blur">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              Compte et chauffeurs vérifiés
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300">
              {current.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{current.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{current.description}</p>
          </div>

          <div className="mt-6 flex gap-2">
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Présentation ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === slide ? "w-8 bg-amber-300" : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        </section>

        {last ? (
          <div className="space-y-3">
            <Link
              href="/inscription"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f0c86b] px-5 font-extrabold text-[#07111f]"
            >
              Créer un compte
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/connexion"
              className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-white/20 bg-white/[.06] px-5 font-bold text-white"
            >
              J’ai déjà un compte
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSlide((value) => Math.min(slides.length - 1, value + 1))}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f0c86b] px-5 font-extrabold text-[#07111f]"
          >
            Suivant
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </main>
  );
}
