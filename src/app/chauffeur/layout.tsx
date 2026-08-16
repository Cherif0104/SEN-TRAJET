"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Route, History, User } from "lucide-react";
import { canAccessDriverZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/chauffeur", labelKey: "nav.today" as const, icon: LayoutDashboard },
  { href: "/chauffeur/missions", labelKey: "nav.missions" as const, icon: Route },
  { href: "/chauffeur/historique", labelKey: "nav.history" as const, icon: History },
  { href: "/chauffeur/profil", labelKey: "nav.profile" as const, icon: User },
];

export default function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const { t } = usePreferences();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent(pathname));
      return;
    }
    if (!profile) {
      void signOut().finally(() => router.replace("/connexion?error=profile_missing"));
      return;
    }
    if (!canAccessDriverZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, pathname, profile, router, signOut, user]);

  if (loading || !user || !profile || !canAccessDriverZone(profile.role)) {
    return <BrandedLoader fullScreen />;
  }

  return (
    <PremiumShell title={t("shell.driverTitle")} subtitle={t("shell.driverSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
