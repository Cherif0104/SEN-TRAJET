"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { ensureClientForUser, listPartnerContracts } from "@/lib/platformOps";

export default function PartenaireReserverPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const id = await ensureClientForUser({
        userId: user.id,
        fullName: profile?.full_name,
        phone: profile?.phone,
        email: user.email,
        companyName: profile?.full_name,
        clientType: "entreprise",
      });
      setClientId(id);
      const contracts = await listPartnerContracts().catch(() => []);
      const mine = contracts.find((c) => c.partner_user_id === user.id) || contracts.find((c) => c.status === "active");
      setContractId(mine?.id ?? null);
    })();
  }, [user, profile]);

  return (
    <>
      <SjSectionHead eyebrow="Demande partenaire" title="Nouvelle demande" />
      <SjCard>
        {clientId ? (
          <BookingForm
            segment="partner"
            clientId={clientId}
            partnerContractId={contractId}
            onCreated={() => router.push("/partenaire/demandes")}
          />
        ) : (
          <BrandedLoader />
        )}
      </SjCard>
    </>
  );
}
