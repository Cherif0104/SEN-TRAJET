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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminZone } from "@/lib/rbac";
import { supabase } from "@/lib/supabase";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";

const nav = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/demandes", label: "Demandes", icon: ClipboardList },
  { href: "/admin/reservations", label: "Réservations", icon: Calendar },
  { href: "/admin/dispatch", label: "Dispatch", icon: ArrowLeftRight },
  { href: "/admin/crm", label: "CRM / pipeline", icon: Inbox },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/admin/partenaires", label: "Partenaires", icon: Building2 },
  { href: "/admin/proprietaires", label: "Propriétaires", icon: Landmark },
  { href: "/admin/clients", label: "Clients", icon: Contact },
  { href: "/admin/vehicules", label: "Flotte", icon: Car },
  { href: "/admin/tarification", label: "Tarification", icon: BadgeDollarSign },
  { href: "/admin/regles", label: "Règles métier", icon: SlidersHorizontal },
  { href: "/admin/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion?next=" + encodeURIComponent(pathname));
        return;
      }
      if (profile && !canAccessAdminZone(profile.role)) {
        router.replace("/dashboard?forbidden=1");
      }
    })();
  }, [loading, profile, router, pathname]);

  if (!loading && profile && !canAccessAdminZone(profile.role)) {
    return null;
  }

  return (
    <PremiumShell title="Direction" subtitle="Cockpit opérations" nav={nav}>
      {children}
    </PremiumShell>
  );
}
