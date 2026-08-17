"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserPlus, Contact, ClipboardList, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessCommercialZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/commercial", label: "Accueil", icon: LayoutDashboard },
  { href: "/commercial/prospects", label: "Prospects", icon: UserPlus },
  { href: "/commercial/clients", label: "Clients", icon: Contact },
  { href: "/commercial/demandes", label: "Demandes", icon: ClipboardList },
  { href: "/commercial/activite", label: "Activité", icon: Activity },
];

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessCommercialZone(profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessCommercialZone(profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="Commercial" subtitle="Développer les ventes SentraJet Premium" nav={nav}>
      {children}
    </PremiumShell>
  );
}
