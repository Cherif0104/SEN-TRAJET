"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
import { useAuth } from "@/hooks/useAuth";
import { workspaceForRole } from "@/lib/rbac";

/**
 * Point d’entrée unique « tableau de bord » : renvoie vers l’espace selon le rôle.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent("/dashboard"));
      return;
    }
    if (!profile) {
      return;
    }
    router.replace(workspaceForRole(profile.role));
  }, [loading, profile, router, user]);

  if (!loading && user && !profile) return <ProfileAccessRecovery />;
  return <BrandedLoader fullScreen />;
}
