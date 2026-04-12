"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HomeContinued } from "@/components/landing/HomeContinued";

/**
 * Affiche la landing page pour les visiteurs non connectés.
 * Redirige les utilisateurs connectés vers leur espace (boarding) selon le rôle.
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
    // Pas de rôle ou autre → on reste sur la landing (ou on pourrait rediriger /compte par défaut)
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <HomeContinued />
      </main>
      <Footer />
    </div>
  );
}
