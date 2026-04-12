"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, Coins, CalendarCheck, FileSearch, User, HelpCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/profiles";
import { canAccessDriverZone } from "@/lib/rbac";

const nav = [
  { href: "/chauffeur", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/chauffeur/trajet/nouveau", label: "Publier un trajet", icon: PlusCircle },
  { href: "/chauffeur/reservations", label: "Mes réservations", icon: CalendarCheck },
  { href: "/chauffeur/demandes", label: "Demandes", icon: FileSearch },
  { href: "/chauffeur/credits", label: "Crédits", icon: Coins },
  { href: "/chauffeur/profil", label: "Mon profil", icon: User },
  { href: "/contact", label: "Aide / Réclamation", icon: HelpCircle },
];

const mobileNav = [
  { href: "/chauffeur", label: "Accueil", icon: LayoutDashboard },
  { href: "/chauffeur/trajet/nouveau", label: "Publier", icon: PlusCircle },
  { href: "/chauffeur/reservations", label: "Réservations", icon: CalendarCheck },
  { href: "/chauffeur/profil", label: "Profil", icon: User },
];

export default function ChauffeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion?next=" + encodeURIComponent(pathname));
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!canAccessDriverZone(profile?.role)) {
        const target =
          profile?.role === "partner" || profile?.role === "partner_manager" || profile?.role === "partner_operator"
            ? "/partenaire"
            : profile?.role === "client"
              ? "/compte"
              : profile?.role && profile.role !== "driver"
                ? "/admin"
                : "/";
        router.replace(target);
        return;
      }
      const inviteCode = user.user_metadata?.invite_code;
      if (inviteCode && typeof inviteCode === "string") {
        try {
          const res = await fetch(`/api/partners/invite/${encodeURIComponent(inviteCode)}`);
          if (res.ok) {
            const { partner_id } = await res.json();
            await updateProfile(user.id, { partner_id });
            await supabase.auth.updateUser({ data: { invite_code: null } });
          }
        } catch {
          // ignore
        }
      }
      setReady(true);
    })();
  }, [pathname, router]);

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
        <main className="min-w-0 flex-1">{children}</main>
      </div>
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
      <div className="h-16 md:hidden" />
    </div>
  );
}
