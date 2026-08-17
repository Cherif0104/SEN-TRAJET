"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  Settings,
  ArrowLeftRight,
  Building2,
  Contact,
  BadgeDollarSign,
  BarChart3,
  SlidersHorizontal,
  Landmark,
  Inbox,
  ClipboardList,
  UserCog,
  CircleUserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";
import { usePreferences } from "@/providers/PreferencesProvider";

const nav = [
  { href: "/admin", labelKey: "nav.overview" as const, icon: LayoutDashboard },
  { href: "/admin/demandes", labelKey: "nav.requests" as const, icon: ClipboardList },
  { href: "/admin/reservations", labelKey: "nav.reservations" as const, icon: Calendar },
  { href: "/admin/dispatch", labelKey: "nav.dispatch" as const, icon: ArrowLeftRight },
  { href: "/admin/crm", labelKey: "nav.crm" as const, icon: Inbox },
  { href: "/admin/chauffeurs", labelKey: "nav.drivers" as const, icon: Users },
  { href: "/admin/partenaires", labelKey: "nav.partners" as const, icon: Building2 },
  { href: "/admin/proprietaires", labelKey: "nav.owners" as const, icon: Landmark },
  { href: "/admin/clients", labelKey: "nav.clients" as const, icon: Contact },
  { href: "/admin/utilisateurs", labelKey: "nav.users" as const, icon: UserCog },
  { href: "/admin/vehicules", labelKey: "nav.fleet" as const, icon: Car },
  { href: "/admin/tarification", labelKey: "nav.pricing" as const, icon: BadgeDollarSign },
  { href: "/admin/regles", labelKey: "nav.businessRules" as const, icon: SlidersHorizontal },
  { href: "/admin/rapports", labelKey: "nav.reports" as const, icon: BarChart3 },
  { href: "/admin/profil", labelKey: "nav.profile" as const, icon: CircleUserRound },
  { href: "/admin/parametres", labelKey: "nav.settings" as const, icon: Settings },
];

const mobileNav = nav.filter((item) =>
  [
    "/admin",
    "/admin/demandes",
    "/admin/dispatch",
    "/admin/utilisateurs",
    "/admin/profil",
  ].includes(item.href),
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessAdminZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) {
    return <BrandedLoader fullScreen />;
  }
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessAdminZone(profile.role)) return <BrandedLoader fullScreen />;

  const visibleNav =
    profile?.role === "super_admin"
      ? nav
      : nav.filter((item) => item.href !== "/admin/utilisateurs");
  const visibleMobileNav = mobileNav.filter((item) =>
    visibleNav.some((visible) => visible.href === item.href),
  );

  return (
    <PremiumShell
      title={t("shell.adminTitle")}
      subtitle={t("shell.adminSubtitle")}
      nav={visibleNav}
      mobileNav={visibleMobileNav}
    >
      {children}
    </PremiumShell>
  );
}
