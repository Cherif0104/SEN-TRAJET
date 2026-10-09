"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CarFront, MapPinned, Plane, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";

export function AirportLanding() {
  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <Header />
      <main className="mx-auto max-w-6xl overflow-hidden px-4 pb-10 pt-7 sm:px-6 sm:pt-12">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,#10223a,#07111f_65%)] px-5 pb-7 pt-6 shadow-2xl sm:px-10 sm:py-12">
          <div className="absolute -right-20 -top-16 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-300">
              <Plane className="h-4 w-4" />
              Dakar ↔ Aéroport AIBD
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Votre taxi aéroport, <span className="text-[#f0c86b]">sans attente.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Réservez maintenant ou planifiez votre départ. Adresse GPS, tarif affiché et suivi de
              votre course dans une seule application.
            </p>
            <Link
              href="/taxi-aeroport"
              className="mt-7 flex min-h-14 w-full items-center justify-between rounded-2xl bg-[#f0c86b] px-5 font-extrabold text-[#07111f] shadow-[0_14px_40px_-18px_rgba(240,200,107,.8)] sm:w-fit sm:min-w-72"
            >
              Trouver un taxi
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            {[
              { icon: MapPinned, value: "GPS", label: "Prise en charge" },
              { icon: CarFront, value: "3", label: "Classes" },
              { icon: ShieldCheck, value: "Vérifié", label: "Chauffeurs" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[.06] p-3 backdrop-blur">
                <Icon className="h-4 w-4 text-amber-300" />
                <p className="mt-3 text-sm font-extrabold sm:text-base">{value}</p>
                <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/taxi-aeroport"
            className="flex items-center gap-4 rounded-3xl bg-white p-5 text-slate-950"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <CarFront className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <strong className="block">Partir maintenant</strong>
              <span className="mt-1 block text-sm text-slate-500">Un véhicule complet pour votre trajet</span>
            </span>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-slate-400" />
          </Link>
          <Link
            href="/taxi-aeroport"
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[.06] p-5 text-white"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-amber-300">
              <CalendarClock className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <strong className="block">Planifier un transfert</strong>
              <span className="mt-1 block text-sm text-slate-400">Date, heure et numéro de vol</span>
            </span>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-slate-500" />
          </Link>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          Course privée uniquement · Le mode place partagée sera proposé séparément.
        </p>
      </main>
    </div>
  );
}
