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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
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
  { href: "/admin/parametres", labelKey: "nav.settings" as const, icon: Settings },
];

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
    if (profile && !canAccessAdminZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user || (profile && !canAccessAdminZone(profile.role))) {
    return <BrandedLoader fullScreen />;
  }

  return (
    <PremiumShell title={t("shell.adminTitle")} subtitle={t("shell.adminSubtitle")} nav={nav}>
      {children}
    </PremiumShell>
  );
}
