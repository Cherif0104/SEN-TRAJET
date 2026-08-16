import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
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
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
        {children}
      </main>
    </div>
  );
}

export function AuthPageFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Header />
      <main className="grid flex-1 place-items-center px-4 py-12">
        <BrandedLoader />
      </main>
    </div>
  );
}
