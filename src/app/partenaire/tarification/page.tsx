"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listPartnerContracts } from "@/lib/platformOps";
import { formatFcfa, getSentrajetTariffs, SERVICE_TYPE_LABELS, type SentrajetTariff, type ServiceType } from "@/lib/sentrajetPricing";
import { listPartnerTariffOverrides, type PartnerTariffOverride } from "@/lib/partnerTariffs";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function PartenaireTarificationPage() {
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);
  const [overrides, setOverrides] = useState<PartnerTariffOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      try {
        const [genericTariffs, contracts] = await Promise.all([
          getSentrajetTariffs("partner"),
          listPartnerContracts().catch(() => []),
        ]);
        setTariffs(genericTariffs);
        const mine = contracts.find((c) => c.partner_user_id === user.id && c.status === "active");
        if (mine) {
          setOverrides(await listPartnerTariffOverrides(mine.id).catch(() => []));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="B2B" title="Ma tarification" />

      {overrides.length ? (
        <>
          <SjCard style={{ marginBottom: 16, borderColor: "var(--sj-gold)" }}>
            <h3 style={{ marginTop: 0 }}>Vos tarifs négociés</h3>
            <p className="sj-muted">Ces tarifs remplacent la grille générique pour les prestations concernées.</p>
            <div className="sj-list" style={{ marginTop: 10 }}>
              {overrides.filter((o) => o.is_active).map((o) => (
                <div key={o.id} className="sj-row">
                  <span>{SERVICE_TYPE_LABELS[o.service_type as ServiceType] ?? o.service_type}</span>
                  <b className="sj-gold">
                    {o.pricing_mode === "forfait"
                      ? formatFcfa(o.base_price_fcfa ?? 0)
                      : `${formatFcfa(o.price_per_km_fcfa ?? 0)}/km${o.minimum_price_fcfa ? ` (min. ${formatFcfa(o.minimum_price_fcfa)})` : ""}`}
                  </b>
                </div>
              ))}
            </div>
          </SjCard>
          <SjSectionHead title="Grille générique (autres prestations)" action={<SjBadge tone="info">Référence</SjBadge>} />
        </>
      ) : null}

      <SjCard>
        <div className="sj-list">
          {tariffs.map((t) => (
            <div key={t.rule_key} className="sj-row">
              <span>{t.label}</span>
              <b className="sj-gold">
                {t.unit === "sur_devis" ? "Sur devis" : formatFcfa(t.amount_fcfa)}
                {t.unit === "per_km" ? "/km" : ""}
              </b>
            </div>
          ))}
        </div>
      </SjCard>
      <SjCard style={{ marginTop: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Ces tarifs sont ceux facturés par SentraJet à votre structure. Vous conservez votre marge en
          refacturant vos clients finaux.
        </p>
      </SjCard>
    </>
  );
}
