"use client";

import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { SjSectionHead } from "@/components/sentrajet/PremiumShell";

export default function RhProfilPage() {
  return (
    <>
      <SjSectionHead title="Mon profil" />
      <AccountProfilePanel roleLabel="Ressources humaines" />
    </>
  );
}
