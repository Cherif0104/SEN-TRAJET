"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { ensureClientForUser, listPartnerContracts } from "@/lib/platformOps";
import { getPartnerClient, type PartnerClient } from "@/lib/partnerClients";

function PartenaireReserverContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<PartnerClient | null>(null);
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

        if (preselectedClientId) {
          const client = await getPartnerClient(preselectedClientId).catch(() => null);
          setSelectedClient(client);
          setClientId(preselectedClientId);
          return;
        }

        const id = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: profile?.phone,
          email: user.email,
          companyName: profile?.full_name,
          clientType: "entreprise",
        });
        setClientId(id);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile, preselectedClientId]);

  return (
    <>
      <SjSectionHead eyebrow="Réservation partenaire" title="Nouvelle réservation" />
      {!preselectedClientId ? (
        <SjCard style={{ marginBottom: 16 }}>
          <p className="sj-muted" style={{ margin: 0 }}>
            Cette réservation sera enregistrée pour votre organisation. Pour facturer un client précis de
            votre carnet, <Link href="/partenaire/clients" className="sj-gold">sélectionnez-le ici</Link>.
          </p>
        </SjCard>
      ) : (
        <SjCard style={{ marginBottom: 16 }}>
          <p className="sj-muted" style={{ margin: 0 }}>
            Réservation pour <b>{selectedClient?.full_name || selectedClient?.company_name || "ce client"}</b>.
          </p>
        </SjCard>
      )}
      <SjCard>
        {!loading && clientId ? (
          <BookingForm
            segment="partner"
            clientId={clientId}
            partnerContractId={contractId}
            submitDisabledReason={
              contractId
                ? null
                : "La simulation reste disponible, mais un contrat partenaire actif est requis pour envoyer la demande."
            }
            onCreated={() => router.push("/partenaire/demandes")}
          />
        ) : (
          <BrandedLoader />
        )}
      </SjCard>
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
