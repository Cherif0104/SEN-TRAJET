import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type AuthPageScaffoldProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  eyebrow?: string;
};

/**
 * Mise en page commune connexion / inscription (fond, en-tête, titrage).
 */
export function AuthPageScaffold({
  children,
  title,
  subtitle,
  eyebrow = "Compte",
}: AuthPageScaffoldProps) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.85fr)]">
      <main className="flex min-h-screen flex-col px-4 pb-10 pt-4 sm:px-8 lg:px-12 lg:py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Retour à l’accueil"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="[&_img]:!h-8" />
          <span className="h-11 w-11" aria-hidden />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#07111f] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Vos données et vos réservations sont protégées par les contrôles d’accès SentraJet.
          </p>
        </div>
      </main>

      <aside className="relative hidden min-h-screen overflow-hidden bg-[#07111f] lg:block">
        <Image
          src="/images/hero-sen-trajet.png"
          alt="Véhicules et chauffeur SentraJet"
          fill
          priority
          className="object-cover opacity-70"
          sizes="45vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-[#07111f]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight text-white">
            Une mobilité fiable, pensée pour chaque trajet.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Aéroport, déplacements professionnels, location et trajets interurbains depuis une seule plateforme.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function AuthPageFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-4">
      <BrandedLoader />
    </div>
  );
}
