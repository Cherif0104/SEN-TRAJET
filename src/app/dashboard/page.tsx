"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { canAccessAdminZone, canAccessDriverZone, canAccessPartnerZone } from "@/lib/rbac";

/**
 * Point d’entrée unique « tableau de bord » : renvoie vers l’espace selon le rôle.
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/connexion?next=" + encodeURIComponent("/dashboard"));
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      const role = profile?.role ?? null;
      if (canAccessAdminZone(role)) {
        router.replace("/admin");
        return;
      }
      if (canAccessPartnerZone(role)) {
        router.replace("/partenaire");
        return;
      }
      if (canAccessDriverZone(role)) {
        router.replace("/chauffeur");
        return;
      }
      router.replace("/compte");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-neutral-600">Redirection vers votre espace…</p>
      </main>
    </div>
  );
}
