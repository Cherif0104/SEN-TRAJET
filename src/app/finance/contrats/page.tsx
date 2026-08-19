"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listAllVehicleContracts, type FinanceVehicleContract } from "@/lib/financeOps";
import { listPartnerContracts, bookingStatusTone, type PartnerContract } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function FinanceContratsPage() {
  const [partnerContracts, setPartnerContracts] = useState<PartnerContract[]>([]);
  const [vehicleContracts, setVehicleContracts] = useState<FinanceVehicleContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listPartnerContracts().catch(() => []), listAllVehicleContracts().catch(() => [])])
      .then(([pc, vc]) => {
        setPartnerContracts(pc);
        setVehicleContracts(vc);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Finance" title="Contrats" />

      <SjSectionHead title="Contrats commerciaux (prestataires)" />
      <div className="sj-list">
        {partnerContracts.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.partner_name}</b>
                <div className="sj-muted">{c.contract_number}</div>
                <div className="sj-muted">
                  {new Date(c.start_date).toLocaleDateString("fr-FR")} →{" "}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}
                </div>
              </div>
              <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!partnerContracts.length ? <SjCard><p className="sj-muted">Aucun contrat commercial.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Contrats d’exploitation (propriétaires de véhicules)" />
      <div className="sj-list">
        {vehicleContracts.map((c) => (
          <SjCard key={c.id}>
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
        ))}
        {!vehicleContracts.length ? <SjCard><p className="sj-muted">Aucun contrat d’exploitation.</p></SjCard> : null}
      </div>
    </>
  );
}
