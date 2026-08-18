"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, ArrowLeftRight, Route, Car, MessageSquareWarning } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessOpsZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/ops", label: "Accueil", icon: LayoutDashboard },
  { href: "/ops/demandes", label: "Demandes", icon: ClipboardList },
  { href: "/ops/dispatch", label: "Dispatch", icon: ArrowLeftRight },
  { href: "/ops/missions", label: "Missions", icon: Route },
  { href: "/ops/flotte", label: "Flotte", icon: Car },
  { href: "/ops/reclamations", label: "Réclamations", icon: MessageSquareWarning },
];

const mobileNav = nav.slice(0, 4);

export default function OpsLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessOpsZone(profile.internalRole, profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessOpsZone(profile.internalRole, profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="Opérations" subtitle="Cockpit opérationnel SentraJet Premium" nav={nav} mobileNav={mobileNav}>
      {children}
    </PremiumShell>
  );
}
