"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listPartnerContracts, type PartnerContract } from "@/lib/platformOps";
import { listAllOwners, type FleetOwner } from "@/lib/fleetOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ManagerPartenairesPage() {
  const [contracts, setContracts] = useState<PartnerContract[]>([]);
  const [owners, setOwners] = useState<FleetOwner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listPartnerContracts().catch(() => []), listAllOwners().catch(() => [])])
      .then(([c, o]) => {
        setContracts(c);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  const activeContracts = contracts.filter((c) => c.status === "active");
  const activeOwners = owners.filter((o) => o.status === "active" || o.status === "actif");

  return (
    <>
      <SjSectionHead
        eyebrow="Manager"
        title="Prestataires & partenaires — supervision"
        action={
          <div className="sj-toolbar">
            <Link href="/commercial" className="sj-btn">Commercial →</Link>
            <Link href="/admin/proprietaires" className="sj-btn">Propriétaires →</Link>
          </div>
        }
      />

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <div className="sj-muted">Contrats commerciaux actifs</div>
          <div className="sj-metric">{activeContracts.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">sur {contracts.length} au total</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Partenaires capital actifs</div>
          <div className="sj-metric">{activeOwners.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">sur {owners.length} au total</div>
        </SjCard>
      </div>

      <SjSectionHead title="Contrats commerciaux" />
      <div className="sj-list">
        {contracts.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.partner_name}</b>
                <div className="sj-muted">{c.contract_number}</div>
              </div>
              <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!contracts.length ? <SjCard><p className="sj-muted">Aucun contrat commercial.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Partenaires capital & actifs" />
      <div className="sj-list">
        {owners.map((o) => (
          <SjCard key={o.id}>
            <div className="sj-between">
              <div>
                <b>{o.full_name || o.company_name || "Partenaire"}</b>
                <div className="sj-muted">{o.matricule || "—"} · {o.partner_kind || "—"}</div>
              </div>
              <SjBadge tone={bookingStatusTone(o.status)}>{o.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!owners.length ? <SjCard><p className="sj-muted">Aucun partenaire capital enregistré.</p></SjCard> : null}
      </div>
    </>
  );
}
