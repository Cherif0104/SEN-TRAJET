"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, FileText, User, MessageCircle, HelpCircle, Car, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/compte", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/compte/reservations", label: "Mes réservations", icon: CalendarCheck },
  { href: "/compte/locations", label: "Mes locations", icon: Car },
  { href: "/compte/demandes", label: "Mes demandes", icon: FileText },
  { href: "/compte/profil", label: "Mon profil", icon: User },
];

const mobileNav = [
  { href: "/compte", label: "Accueil", icon: LayoutDashboard },
  { href: "/compte/reservations", label: "Réserv.", icon: CalendarCheck },
  { href: "/compte/demandes", label: "Envois", icon: Package },
  { href: "/compte/locations", label: "Location", icon: Car },
  { href: "/compte/profil", label: "Profil", icon: User },
];

export default function CompteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
      if (profile?.role !== "client") {
        router.replace("/");
        return;
      }
    })();
  }, [pathname, router]);

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
            <Link
              href="/messages"
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              <MessageCircle className="h-5 w-5" /> Messages
            </Link>
            <Link
              href="/contact"
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              <HelpCircle className="h-5 w-5" /> Aide / Réclamation
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
        <div className="mx-auto flex max-w-md items-center rounded-2xl border border-neutral-200/90 bg-white/95 p-1.5 shadow-lg backdrop-blur">
          {mobileNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-500 hover:bg-neutral-100 active:scale-[0.98]"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-neutral-500"}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}
