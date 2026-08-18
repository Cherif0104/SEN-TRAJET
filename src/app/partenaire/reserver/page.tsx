"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { PartnerBookingWizard } from "@/components/sentrajet/PartnerBookingWizard";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { ensureClientForUser, listPartnerContracts } from "@/lib/platformOps";

function PartenaireReserverContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const [ownClientId, setOwnClientId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const contracts = await listPartnerContracts().catch(() => []);
        const mine = contracts.find(
          (contract) => contract.partner_user_id === user.id && contract.status === "active",
        );
        setContractId(mine?.id ?? null);

        const id = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: profile?.phone,
          email: user.email,
          companyName: profile?.full_name,
          clientType: "entreprise",
        }).catch(() => null);
        setOwnClientId(id);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile]);

  return (
    <>
      <SjSectionHead eyebrow="Réservation partenaire" title="Nouvelle réservation" />
      {!loading ? (
        <PartnerBookingWizard
          contractId={contractId}
          ownClientId={ownClientId}
          initialClientId={preselectedClientId}
          submitDisabledReason={
            contractId
              ? null
              : "La simulation reste disponible, mais un contrat partenaire actif est requis pour envoyer la demande."
          }
        />
      ) : (
        <BrandedLoader />
      )}
    </>
  );
}

export default function PartenaireReserverPage() {
  return (
    <Suspense fallback={<BrandedLoader />}>
      <PartenaireReserverContent />
    </Suspense>
  );
}
