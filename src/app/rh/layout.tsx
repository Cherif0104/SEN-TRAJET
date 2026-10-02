"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, Activity, CalendarDays, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessRhZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/rh", label: "Accueil", icon: LayoutDashboard },
  { href: "/rh/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/rh/planning", label: "Planning", icon: CalendarDays },
  { href: "/rh/documents", label: "Documents", icon: FileText },
  { href: "/rh/suivi", label: "Suivi", icon: Activity },
  { href: "/rh/profil", label: "Profil", icon: User },
];

export default function RhLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessRhZone(profile.internalRole, profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessRhZone(profile.internalRole, profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="RH" subtitle="Chauffeurs et dossiers SentraJet Premium" nav={nav}>
      {children}
    </PremiumShell>
  );
}
