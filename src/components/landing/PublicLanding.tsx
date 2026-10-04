"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CarFront, LockKeyhole, Plane, Route, ShieldCheck, Sparkles, UserRound, UsersRound } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const services = [
  { title: "Course en ville", detail: "Un chauffeur proche, en temps réel", href: "/course", icon: CarFront },
  { title: "Taxi AIBD", detail: "Transferts aéroport immédiats", href: "/taxi-aeroport", icon: Plane },
  { title: "Louer une voiture", detail: "Véhicules et disponibilités réelles", href: "/flotte", icon: Sparkles },
  { title: "Chauffeur VIP", detail: "Mise à disposition 4 h, 8 h ou 12 h", href: "/vip", icon: ShieldCheck },
  { title: "Interurbain Premium", detail: "Véhicule privé et prix immédiat", href: "/interurbain", icon: Route },
  { title: "Allo Dakar", detail: "Départs interurbains vérifiés", href: "/allo-dakar", icon: UsersRound },
  { title: "Mon Chauffeur", detail: "Votre voiture, notre chauffeur", href: "/mon-chauffeur", icon: UserRound },
] as const;

function loginHref(destination: string): string {
  return `/connexion?next=${encodeURIComponent(destination)}`;
}

export function PublicLanding() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#07111f]">
      <Header />
      <main>
        <section className="relative min-h-[610px] overflow-hidden bg-[#07111f]">
          <Image
            src="/brand/sentrajet-vehicle-hero.webp"
            alt="Véhicule SentraJet"
            fill
            priority
            className="object-cover object-center opacity-60"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07111f] via-[#07111f]/80 to-[#07111f]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-transparent to-[#07111f]/35" />
          <div className="relative mx-auto flex min-h-[610px] max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Mobilité premium au Sénégal
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Tous vos déplacements. Une seule application.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
                Course immédiate, taxi AIBD, location et trajets Allo Dakar avec des véhicules et chauffeurs contrôlés.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/inscription?role=client" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-black text-[#07111f]">
                  Créer mon compte <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/connexion" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur">
                  J’ai déjà un compte
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-white/55">
                <LockKeyhole className="h-3.5 w-3.5" />
                Un compte vérifié est requis pour rechercher et réserver.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Les services SentraJet</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Choisissez, connectez-vous, partez.</h2>
            <p className="mt-3 text-slate-600">Découvrez les offres. L’accès aux recherches en direct et aux réservations s’ouvre après connexion.</p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {services.map(({ title, detail, href, icon: Icon }, index) => (
              <Link
                key={title}
                href={loginHref(href)}
                className={`group flex min-h-40 items-end justify-between overflow-hidden rounded-3xl p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                  href === "/allo-dakar" ? "bg-emerald-900" : index >= 2 ? "bg-gradient-to-br from-[#514016] to-[#07111f]" : "bg-[#0e1f36]"
                }`}
              >
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-1 text-sm text-white/65">{detail}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#07111f]"><LockKeyhole className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
