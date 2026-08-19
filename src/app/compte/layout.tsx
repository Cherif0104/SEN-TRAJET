"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, User, Heart } from "lucide-react";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/compte", labelKey: "nav.home" as const, icon: LayoutDashboard },
  { href: "/compte/reservations", label: "Courses", icon: CalendarCheck },
  { href: "/compte/favoris", label: "Favoris", icon: Heart },
  { href: "/compte/profil", labelKey: "nav.profile" as const, icon: User },
];

export default function CompteLayout({ children }: { children: React.ReactNode }) {
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
    if (profile.role !== "client") router.replace("/dashboard?forbidden=1");
  }, [loading, pathname, profile, router, user]);

  if (loading || !user) {
    return <BrandedLoader fullScreen />;
  }
  if (!profile) return <ProfileAccessRecovery />;
  if (profile.role !== "client") return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title={t("shell.clientTitle")} subtitle={t("shell.clientSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
