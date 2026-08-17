"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HomeContinued } from "@/components/landing/HomeContinued";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { workspaceForRole } from "@/lib/rbac";

/**
 * Affiche la landing page pour les visiteurs non connectés.
 * Redirige les utilisateurs connectés vers leur espace (boarding) selon le rôle.
 */
export function LandingOrRedirect() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(profile ? workspaceForRole(profile.role, profile.internalRole) : "/dashboard?forbidden=1");
  }, [user, profile, loading, router]);

  if (user) return <BrandedLoader fullScreen />;

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
