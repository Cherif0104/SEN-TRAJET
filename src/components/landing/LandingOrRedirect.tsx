"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppOnboarding } from "@/components/onboarding/AppOnboarding";

/**
 * La verticale Taxi Aéroport reste accessible aux visiteurs et clients connectés.
 * Les rôles opérationnels rejoignent directement leur espace de travail.
 */
export function LandingOrRedirect() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    const role = profile?.role;
    if (role === "client") {
      router.replace("/compte");
      return;
    }
    if (role === "driver") {
      router.replace("/chauffeur");
      return;
    }
    if (role === "partner" || role === "partner_manager" || role === "partner_operator" || role === "rental_owner") {
      router.replace("/partenaire");
      return;
    }
    if (
      role === "admin" ||
      role === "super_admin" ||
      role === "commercial" ||
      role === "regional_manager" ||
      role === "trainer"
    ) {
      router.replace("/admin");
      return;
    }
    // Un profil connecté est toujours routé vers son espace.
  }, [user, profile?.role, loading, router]);

  if (
    user &&
    (profile?.role === "client" ||
      profile?.role === "driver" ||
      profile?.role === "partner" ||
      profile?.role === "partner_manager" ||
      profile?.role === "partner_operator" ||
      profile?.role === "rental_owner" ||
      profile?.role === "admin" ||
      profile?.role === "super_admin" ||
      profile?.role === "commercial" ||
      profile?.role === "regional_manager" ||
      profile?.role === "trainer")
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-neutral-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-600">Redirection vers votre espace…</p>
      </div>
    );
  }

  if (loading || user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#07111f]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return <AppOnboarding />;
}
