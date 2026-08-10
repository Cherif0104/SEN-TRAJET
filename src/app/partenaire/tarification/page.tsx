"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { formatFcfa, getSentrajetTariffs, type SentrajetTariff } from "@/lib/sentrajetPricing";

export default function PartenaireTarificationPage() {
  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);

  useEffect(() => {
    void getSentrajetTariffs("partner").then(setTariffs);
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="B2B" title="Ma tarification" />
      <SjCard>
        <div className="sj-list">
          {tariffs.map((t) => (
            <div key={t.rule_key} className="sj-row">
              <span>{t.label}</span>
              <b className="sj-gold">
                {formatFcfa(t.amount_fcfa)}
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
