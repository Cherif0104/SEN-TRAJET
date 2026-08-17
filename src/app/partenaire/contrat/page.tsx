"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listPartnerContracts, type PartnerContract } from "@/lib/platformOps";
import { supabase } from "@/lib/supabase";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type OrgInfo = {
  legal_name: string | null;
  trade_name: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
};

function contractTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "active") return "success";
  if (status === "pending" || status === "en_validation") return "warning";
  if (status === "suspended" || status === "terminated") return "danger";
  return "info";
}

export default function PartenaireContratPage() {
  const { user } = useAuth();
  const [contract, setContract] = useState<PartnerContract | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const contracts = await listPartnerContracts().catch(() => []);
        const mine = contracts.find((c) => c.partner_user_id === user.id) ?? null;
        setContract(mine);
        const { data } = await supabase
          .from("partner_organizations")
          .select("legal_name, trade_name, category, city, country, primary_contact_name, primary_contact_phone")
          .eq("user_id", user.id)
          .maybeSingle();
        setOrg((data as OrgInfo | null) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <BrandedLoader />;

  if (!contract) {
    return (
      <>
        <SjSectionHead eyebrow="Contrat" title="Mon contrat" />
        <SjCard>
          <p className="sj-muted">
            Aucun contrat partenaire n’est encore associé à votre compte. Contactez SentraJet pour
            finaliser votre inscription B2B.
          </p>
        </SjCard>
      </>
    );
  }

  return (
    <>
      <SjSectionHead eyebrow="Contrat" title="Mon contrat" />
      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Contrat commercial</h3>
          <div className="sj-list">
            <div className="sj-row"><span>Numéro</span><b>{contract.contract_number}</b></div>
            <div className="sj-row">
              <span>Statut</span>
              <SjBadge tone={contractTone(contract.status)}>{contract.status}</SjBadge>
            </div>
            <div className="sj-row"><span>Début</span><b>{new Date(contract.start_date).toLocaleDateString("fr-FR")}</b></div>
            <div className="sj-row">
              <span>Fin</span>
              <b>{contract.end_date ? new Date(contract.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}</b>
            </div>
          </div>
        </SjCard>
        <SjCard>
          <h3>Structure</h3>
          <div className="sj-list">
            <div className="sj-row"><span>Raison sociale</span><b>{org?.legal_name || contract.partner_name}</b></div>
            {org?.trade_name ? <div className="sj-row"><span>Nom commercial</span><b>{org.trade_name}</b></div> : null}
            <div className="sj-row"><span>Catégorie</span><b>{org?.category || "—"}</b></div>
            <div className="sj-row"><span>Ville</span><b>{org?.city || "—"}</b></div>
            <div className="sj-row"><span>Contact référent</span><b>{org?.primary_contact_name || "—"}</b></div>
          </div>
        </SjCard>
      </div>
      <SjCard style={{ marginTop: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Pour toute modification de contrat (tarifs, conditions, renouvellement), contactez votre
          interlocuteur SentraJet Premium.
        </p>
      </SjCard>
    </>
  );
}
