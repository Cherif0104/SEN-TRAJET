"use client";

import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";

export default function AdminProfilePage() {
  const { t } = usePreferences();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <>
      <SjSectionHead title={t("nav.profile")} />
      <AccountProfilePanel
        roleLabel={
          isSuperAdmin
            ? t("admin.users.role.superAdmin")
            : profile?.role || t("admin.users.role.manager")
        }
        canManageUsers={isSuperAdmin}
      />
    </>
  );
}
