import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
        {children}
      </main>
    </div>
  );
}

export function AuthPageFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-slate-500">Chargement…</p>
      </main>
    </div>
  );
}
