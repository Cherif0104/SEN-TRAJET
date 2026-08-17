"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone } from "@/lib/platformOps";
import { listAllVehicleContracts, type FinanceVehicleContract } from "@/lib/financeOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function FleetContratsPage() {
  const [contracts, setContracts] = useState<FinanceVehicleContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAllVehicleContracts()
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Fleet Manager" title="Contrats d’exploitation" />
      <div className="sj-list">
        {contracts.map((c) => (
          <Link key={c.id} href={c.vehicle_id ? `/admin/vehicules/${c.vehicle_id}` : "/fleet/vehicules"}>
            <SjCard>
              <div className="sj-between">
                <div>
                  <b>{c.vehicle_label}</b>
                  <div className="sj-muted">{c.owner?.full_name || c.owner?.company_name || "Propriétaire"}</div>
                  <div className="sj-muted">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString("fr-FR") : "Début à définir"} →{" "}
                    {c.end_date ? new Date(c.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
                  <div className="sj-gold" style={{ marginTop: 8 }}>{formatFcfa(c.monthly_amount_fcfa)}/mois</div>
                </div>
              </div>
            </SjCard>
          </Link>
        ))}
        {!contracts.length ? <SjCard><p className="sj-muted">Aucun contrat d’exploitation.</p></SjCard> : null}
      </div>
    </>
  );
}
