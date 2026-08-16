"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { supabase } from "@/lib/supabase";
import { bookingStatusTone } from "@/lib/platformOps";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

type OwnerRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  company_name: string | null;
};

type ContractRow = {
  id: string;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  status: string;
  owner_id: string;
};

export default function AdminProprietairesPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [minMonthly, setMinMonthly] = useState(500000);

  useEffect(() => {
    void Promise.all([
      supabase.from("vehicle_owners").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_exploitation_contracts").select("id, vehicle_label, monthly_amount_fcfa, status, owner_id"),
      listBusinessRules("vehicle_partner"),
    ]).then(([o, c, rules]) => {
      setOwners((o.data ?? []) as OwnerRow[]);
      setContracts((c.data ?? []) as ContractRow[]);
      setMinMonthly(ruleNumber(rules, "vehicle_partner", "min_monthly_fcfa", 500000));
    });
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Vehicle Partner" title="Propriétaires / Investisseurs" />
      <SjCard style={{ marginBottom: 16 }}>
        <div className="sj-muted">Condition d’entrée paramétrable</div>
        <div className="sj-metric">À partir de {minMonthly.toLocaleString("fr-FR")} FCFA/mois</div>
        <div className="sj-metric-sub">Modalités contractuelles — pas un rendement garanti</div>
      </SjCard>

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Propriétaires</h3>
          <div className="sj-list">
            {owners.map((o) => (
              <div key={o.id} className="sj-row">
                <div>
                  <b>{o.full_name}</b>
                  <div className="sj-muted">{o.company_name || o.phone || o.email || "—"}</div>
                </div>
                <SjBadge tone={bookingStatusTone(o.status)}>{o.status}</SjBadge>
              </div>
            ))}
            {!owners.length ? <div className="sj-muted">Aucun propriétaire enregistré.</div> : null}
          </div>
        </SjCard>
        <SjCard>
          <h3>Contrats d’exploitation</h3>
          <div className="sj-list">
            {contracts.map((c) => (
              <div key={c.id} className="sj-row">
                <div>
                  <b>{c.vehicle_label}</b>
                  <div className="sj-muted">{Number(c.monthly_amount_fcfa).toLocaleString("fr-FR")} F/mois</div>
                </div>
                <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
              </div>
            ))}
            {!contracts.length ? <div className="sj-muted">Aucun contrat.</div> : null}
          </div>
        </SjCard>
      </div>
    </>
  );
}
