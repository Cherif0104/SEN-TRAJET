"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Route, History, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { canAccessDriverZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";

const nav = [
  { href: "/chauffeur", label: "Aujourd’hui", icon: LayoutDashboard },
  { href: "/chauffeur/missions", label: "Mes missions", icon: Route },
  { href: "/chauffeur/historique", label: "Historique", icon: History },
  { href: "/chauffeur/profil", label: "Mon profil", icon: User },
];

export default function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
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
        role = roles?.[0]?.role as string | undefined;
      }
      if (!canAccessDriverZone(role)) {
        router.replace("/dashboard?forbidden=1");
        return;
      }
      setReady(true);
    })();
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="sj-app" style={{ display: "grid", placeItems: "center" }}>
        <p className="sj-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <PremiumShell title="Chauffeur" subtitle="Missions flotte" nav={nav}>
      {children}
    </PremiumShell>
  );
}
