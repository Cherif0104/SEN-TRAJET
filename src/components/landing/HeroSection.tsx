"use client";

import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-[min(92vh,720px)] overflow-hidden bg-slate-950 pb-16 pt-8 sm:min-h-[min(88vh,780px)] sm:pb-20 sm:pt-12 lg:pt-16">
      <div className="absolute inset-0">
        <Image
          src="/brand/sentrajet-hero.png"
          alt="Véhicule SentraJet Premium"
          fill
          priority
          quality={90}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950/90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-300">SENTRAJET PREMIUM</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          Votre trajet, notre priorité.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-100/90 drop-shadow sm:text-lg">
          Transfert aéroport, voyage interurbain ou mise à disposition avec chauffeur. Vous réservez —
          SentraJet organise, confirme et envoie le véhicule.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/reserver"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-neutral-900 hover:bg-amber-400"
          >
            Simuler / Réserver
          </Link>
          <a
            href="https://wa.me/221788324069"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            WhatsApp +221 78 832 40 69
          </a>
        </div>

        <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            ["AIBD", "Forfaits clairs selon passagers"],
            ["Voyage", "Tarif au kilomètre"],
            ["Mise à disposition", "50 000 F matinée ≤ 100 km"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 backdrop-blur">
              <p className="text-sm font-bold text-amber-300">{title}</p>
              <p className="mt-1 text-xs text-slate-200">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
