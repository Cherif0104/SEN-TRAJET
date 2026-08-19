"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Contact,
  Receipt,
  UserCircle,
  BadgeDollarSign,
  FileText,
} from "lucide-react";
import { canAccessPartnerZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/partenaire", labelKey: "nav.home" as const, icon: LayoutDashboard },
  { href: "/partenaire/demandes", label: "Réservations", icon: CalendarCheck },
  { href: "/partenaire/clients", labelKey: "nav.clients" as const, icon: Contact },
  { href: "/partenaire/factures", label: "Factures", icon: Receipt },
  { href: "/partenaire/profil", labelKey: "nav.account" as const, icon: UserCircle },
  { href: "/partenaire/tarification", labelKey: "nav.myPricing" as const, icon: BadgeDollarSign },
  { href: "/partenaire/contrat", labelKey: "nav.contract" as const, icon: FileText },
];

const mobileNav = nav.slice(0, 4);

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t } = usePreferences();
  const isOnboarding = pathname === "/partenaire/onboarding";

  useEffect(() => {
    if (loading || isOnboarding) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent(pathname));
      return;
    }
    if (!profile) {
      return;
    }
    if (!canAccessPartnerZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [pathname, router, isOnboarding, loading, profile, user]);

  if (isOnboarding) {
    return (
      <div className="sj-app" style={{ display: "block" }}>
        <div className="sj-content">{children}</div>
      </div>
    );
  }

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessPartnerZone(profile.role)) {
    return <BrandedLoader fullScreen />;
  }

  return (
    <PremiumShell
      title={t("shell.partnerTitle")}
      subtitle={t("shell.partnerSubtitle")}
      nav={nav}
      mobileNav={mobileNav}
    >
      {children}
    </PremiumShell>
  );
}
