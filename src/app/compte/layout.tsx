"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, User, PlusCircle } from "lucide-react";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/compte", labelKey: "nav.home" as const, icon: LayoutDashboard },
  { href: "/reserver", labelKey: "nav.estimate" as const, icon: PlusCircle },
  { href: "/compte/reservations", labelKey: "nav.myReservations" as const, icon: CalendarCheck },
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
    if (profile && profile.role !== "client") router.replace("/");
  }, [loading, pathname, profile, router, user]);

  if (loading || !user || (profile && profile.role !== "client")) {
    return <BrandedLoader fullScreen />;
  }

  return (
    <PremiumShell title={t("shell.clientTitle")} subtitle={t("shell.clientSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
