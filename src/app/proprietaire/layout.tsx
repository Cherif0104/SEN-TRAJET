"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Car, User, BadgeDollarSign, FolderOpen } from "lucide-react";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
import { useAuth } from "@/hooks/useAuth";
import { canAccessOwnerZone } from "@/lib/rbac";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/proprietaire", labelKey: "nav.home" as const, icon: LayoutDashboard },
  { href: "/proprietaire/vehicule", label: "Véhicules", icon: Car },
  { href: "/proprietaire/contrat", labelKey: "nav.contract" as const, icon: FileText },
  { href: "/proprietaire/revenus", label: "Revenus", icon: BadgeDollarSign },
  { href: "/proprietaire/documents", label: "Documents", icon: FolderOpen },
  { href: "/proprietaire/profil", labelKey: "nav.profile" as const, icon: User },
];

const mobileNav = nav.slice(0, 4);

export default function ProprietaireLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessOwnerZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, pathname, profile, router, user]);

  if (loading || !user) {
    return <BrandedLoader fullScreen />;
  }
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessOwnerZone(profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell
      title={t("shell.ownerTitle")}
      subtitle={t("shell.ownerSubtitle")}
      nav={nav}
      mobileNav={mobileNav}
    >
      {children}
    </PremiumShell>
  );
}
