"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CreditCard, Receipt, FileText, BadgeDollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessFinanceZone } from "@/lib/rbac";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { ProfileAccessRecovery } from "@/components/account/ProfileAccessRecovery";

const nav = [
  { href: "/finance", label: "Accueil", icon: LayoutDashboard },
  { href: "/finance/paiements", label: "Paiements", icon: CreditCard },
  { href: "/finance/factures", label: "Factures", icon: Receipt },
  { href: "/finance/contrats", label: "Contrats", icon: FileText },
  { href: "/finance/tarifs", label: "Tarifs", icon: BadgeDollarSign },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
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
    if (!canAccessFinanceZone(profile.internalRole, profile.role)) {
      router.replace("/dashboard?forbidden=1");
    }
  }, [loading, profile, router, pathname, user]);

  if (loading || !user) return <BrandedLoader fullScreen />;
  if (!profile) return <ProfileAccessRecovery />;
  if (!canAccessFinanceZone(profile.internalRole, profile.role)) return <BrandedLoader fullScreen />;

  return (
    <PremiumShell title="Finance" subtitle="Paiements, factures, contrats et tarifs SentraJet Premium" nav={nav}>
      {children}
    </PremiumShell>
  );
}
