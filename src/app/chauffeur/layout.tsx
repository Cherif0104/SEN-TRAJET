"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Route, History, User } from "lucide-react";
import { canAccessDriverZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
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
  const { user, profile, loading } = useAuth();
  const { t } = usePreferences();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent(pathname));
      return;
    }
    if (!profile) {
      return;
    }
    if (!canAccessDriverZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, pathname, profile, router, user]);

  if (loading || !user) {
    return <BrandedLoader fullScreen />;
  }
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessDriverZone(profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title={t("shell.driverTitle")} subtitle={t("shell.driverSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
