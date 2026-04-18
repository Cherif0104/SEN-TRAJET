"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Coins, UserCircle, HelpCircle, Car, CalendarCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { getPartnerByUserId } from "@/lib/partners";
import { canAccessPartnerZone } from "@/lib/rbac";

const nav = [
  { href: "/partenaire", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/partenaire/location/vehicules", label: "Flotte location", icon: Car },
  { href: "/partenaire/location/reservations", label: "Loc. réservations", icon: CalendarCheck },
  { href: "/partenaire/chauffeurs", label: "Mes chauffeurs", icon: Users },
  { href: "/partenaire/commissions", label: "Commissions", icon: Coins },
  { href: "/partenaire/profil", label: "Mon profil", icon: UserCircle },
  { href: "/contact", label: "Aide / Réclamation", icon: HelpCircle },
];

const mobileNav = [
  { href: "/partenaire", label: "Accueil", icon: LayoutDashboard },
  { href: "/partenaire/location/vehicules", label: "Flotte", icon: Car },
  { href: "/partenaire/location/reservations", label: "Locations", icon: CalendarCheck },
  { href: "/partenaire/commissions", label: "Commissions", icon: Coins },
  { href: "/partenaire/profil", label: "Profil", icon: UserCircle },
];

export default function PartenaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isOnboarding = pathname === "/partenaire/onboarding";

  useEffect(() => {
    (async () => {
      if (isOnboarding) {
        setReady(true);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion?next=" + encodeURIComponent(pathname));
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!canAccessPartnerZone(profile?.role)) {
        router.replace(
          profile?.role === "client"
            ? "/compte"
            : profile?.role === "driver"
              ? "/chauffeur"
              : profile?.role
                ? "/admin"
                : "/"
        );
        return;
      }

      // Les profils propriétaires (partner / rental_owner) doivent avoir une fiche partenaire active.
      if (profile?.role === "partner" || profile?.role === "rental_owner") {
        try {
          const partner = await getPartnerByUserId(user.id);
          if (!partner) {
            router.replace("/partenaire/onboarding");
            return;
          }
        } catch {
          router.replace("/partenaire/onboarding");
          return;
        }
      }
      setReady(true);
    })();
  }, [pathname, router, isOnboarding]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <p className="text-neutral-500">Chargement…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <div className="mx-auto flex w-full max-w-4xl flex-1 gap-6 px-4 py-6 sm:px-6">
        {!isOnboarding && (
          <aside className="hidden w-56 shrink-0 md:block">
            <nav className="sticky top-20 rounded-xl border border-neutral-200 bg-white p-2 shadow-card">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname === href
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="h-5 w-5" /> {label}
                </Link>
              ))}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-neutral-200 bg-white md:hidden">
          {mobileNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
                pathname === href ? "text-primary" : "text-neutral-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      )}
      {!isOnboarding && <div className="h-16 md:hidden" />}
    </div>
  );
}
