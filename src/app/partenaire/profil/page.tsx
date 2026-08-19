"use client";

import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { usePreferences } from "@/providers/PreferencesProvider";

export default function PartenaireProfilPage() {
  const { t } = usePreferences();

  return (
    <>
      <SjSectionHead title={t("nav.profile")} />
      <AccountProfilePanel roleLabel={t("admin.users.role.partner")} />
    </>
  );
}
