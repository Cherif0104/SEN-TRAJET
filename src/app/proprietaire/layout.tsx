"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Car, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";

const nav = [
  { href: "/proprietaire", label: "Accueil", icon: LayoutDashboard },
  { href: "/proprietaire/contrat", label: "Mon contrat", icon: FileText },
  { href: "/proprietaire/vehicule", label: "Mon véhicule", icon: Car },
  { href: "/proprietaire/profil", label: "Mon profil", icon: User },
];

export default function ProprietaireLayout({ children }: { children: React.ReactNode }) {
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
    <PremiumShell title="Propriétaire" subtitle="Vehicle Partner" nav={nav}>
      {children}
    </PremiumShell>
  );
}
