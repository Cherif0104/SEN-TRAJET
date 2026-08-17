"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Activity, Car, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessManagerZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/manager", label: "Accueil", icon: LayoutDashboard },
  { href: "/manager/activite", label: "Activité", icon: Activity },
  { href: "/manager/flotte", label: "Flotte", icon: Car },
  { href: "/manager/partenaires", label: "Partenaires", icon: Building2 },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessManagerZone(profile.internalRole, profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessManagerZone(profile.internalRole, profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="Manager" subtitle="Supervision SentraJet Premium" nav={nav}>
      {children}
    </PremiumShell>
  );
}
