"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Car, Home, Navigation, UserRound } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/layout/Logo";

/**
 * SentraJet Allo Dakar est une rubrique de la plateforme, pas une application à part : même
 * Header/Footer, même identité visuelle que le reste du site (une seule app, un seul design
 * system). Un simple bandeau de contexte (vert, cohérent avec la tuile « Allo Dakar » de
 * l'accueil) rappelle que ce service fonctionne avec des chauffeurs partenaires indépendants et
 * sa propre tarification — sans jamais ressembler à un site différent.
 */
export function AlloDakarContextBar() {
  return (
    <div className="border-b border-emerald-200 bg-emerald-50">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/allo-dakar" className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Car className="h-3.5 w-3.5" />
          </span>
          Covoiturage interurbain · Allo Dakar
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <Link
            href="/allo-dakar/chauffeur"
            className="rounded-full border border-emerald-300 px-3 py-1 transition hover:bg-emerald-100"
          >
            Devenir chauffeur
          </Link>
          <Link
            href="/allo-dakar/gestionnaire"
            className="hidden rounded-full border border-emerald-300 px-3 py-1 transition hover:bg-emerald-100 sm:inline-block"
          >
            Espace antenne
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AlloDakarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clientExperience =
    pathname === "/allo-dakar" || pathname.startsWith("/allo-dakar/confirmation/");

  if (clientExperience) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-[#07111f]">
        <div className="mx-auto min-h-screen max-w-3xl bg-white shadow-sm">
          <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                aria-label="Retour à l’accueil"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex flex-col items-center">
                <Logo className="[&_img]:!h-7" />
                <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                  Service Allo Dakar
                </span>
              </div>
              <Link
                href="/allo-dakar/chauffeur"
                className="flex h-11 items-center rounded-full bg-emerald-50 px-3 text-[10px] font-extrabold text-emerald-800"
              >
                Chauffeur
              </Link>
            </div>
          </header>
          <main className="min-h-[calc(100vh-72px)] pb-24">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-[74px] max-w-3xl grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
            {[
              { label: "Accueil", href: "/", icon: Home },
              { label: "Allo Dakar", href: "/allo-dakar", icon: Car, active: true },
              { label: "Réserver", href: "/reserver", icon: Navigation },
              { label: "Profil", href: "/connexion", icon: UserRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                    item.active ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <AlloDakarContextBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
