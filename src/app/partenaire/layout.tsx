"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, PlusCircle, CalendarCheck, BadgeDollarSign, UserCircle } from "lucide-react";
import { canAccessPartnerZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/partenaire", labelKey: "nav.home" as const, icon: LayoutDashboard },
  { href: "/partenaire/reserver", labelKey: "nav.newRequest" as const, icon: PlusCircle },
  { href: "/partenaire/demandes", labelKey: "nav.requests" as const, icon: CalendarCheck },
  { href: "/partenaire/tarification", labelKey: "nav.myPricing" as const, icon: BadgeDollarSign },
  { href: "/partenaire/profil", labelKey: "nav.account" as const, icon: UserCircle },
];

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const { t } = usePreferences();
  const isOnboarding = pathname === "/partenaire/onboarding";

  useEffect(() => {
    if (loading || isOnboarding) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent(pathname));
      return;
    }
    if (!profile) {
      void signOut().finally(() => router.replace("/connexion?error=profile_missing"));
      return;
    }
    if (!canAccessPartnerZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [pathname, router, isOnboarding, loading, profile, signOut, user]);

  if (
    !isOnboarding &&
    (loading || !user || !profile || !canAccessPartnerZone(profile.role))
  ) {
    return <BrandedLoader fullScreen />;
  }

  if (isOnboarding) {
    return (
      <div className="sj-app" style={{ display: "block" }}>
        <div className="sj-content">{children}</div>
      </div>
    );
  }

  return (
    <PremiumShell title={t("shell.partnerTitle")} subtitle={t("shell.partnerSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
