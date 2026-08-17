"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Car, Wrench, Landmark, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessFleetZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/fleet", label: "Accueil", icon: LayoutDashboard },
  { href: "/fleet/vehicules", label: "Véhicules", icon: Car },
  { href: "/fleet/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/fleet/proprietaires", label: "Propriétaires", icon: Landmark },
  { href: "/fleet/contrats", label: "Contrats", icon: FileText },
];

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent(pathname));
      return;
    }
    if (!profile) return;
    if (!canAccessFleetZone(profile.internalRole, profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessFleetZone(profile.internalRole, profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="Fleet Manager" subtitle="Gestion de la flotte SentraJet Premium" nav={nav}>
      {children}
    </PremiumShell>
  );
}
