"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, FileText, User, MessageCircle, HelpCircle, Car } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/compte", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/compte/reservations", label: "Mes réservations", icon: CalendarCheck },
  { href: "/compte/locations", label: "Mes locations", icon: Car },
  { href: "/compte/demandes", label: "Mes demandes", icon: FileText },
  { href: "/compte/profil", label: "Mon profil", icon: User },
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-neutral-200 bg-white md:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              pathname === href ? "text-primary" : "text-neutral-500"
            }`}
          >
            <Icon className="h-6 w-6" /> {label}
          </Link>
        ))}
      </nav>
      <div className="h-16 md:hidden" />
    </div>
  );
}
