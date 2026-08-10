"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, PlusCircle, CalendarCheck, BadgeDollarSign, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { canAccessPartnerZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";

const nav = [
  { href: "/partenaire", label: "Accueil", icon: LayoutDashboard },
  { href: "/partenaire/reserver", label: "Nouvelle demande", icon: PlusCircle },
  { href: "/partenaire/demandes", label: "Demandes", icon: CalendarCheck },
  { href: "/partenaire/tarification", label: "Ma tarification", icon: BadgeDollarSign },
  { href: "/partenaire/profil", label: "Mon compte", icon: UserCircle },
];

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isOnboarding = pathname === "/partenaire/onboarding";

  useEffect(() => {
    void (async () => {
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
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      let role = profile?.role as string | undefined;
      if (!role) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1);
        const raw = roles?.[0]?.role as string | undefined;
        role = raw === "provider" ? "partner" : raw;
      }
      if (!canAccessPartnerZone(role)) {
        router.replace("/dashboard?forbidden=1");
        return;
      }
      setReady(true);
    })();
  }, [pathname, router, isOnboarding]);

  if (!ready) {
    return (
      <div className="sj-app" style={{ display: "grid", placeItems: "center" }}>
        <p className="sj-muted">Chargement…</p>
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div className="sj-app" style={{ display: "block" }}>
        <div className="sj-content">{children}</div>
      </div>
    );
  }

  return (
    <PremiumShell title="Partenaire B2B" subtitle="Tarifs négociés" nav={nav}>
      {children}
    </PremiumShell>
  );
}
