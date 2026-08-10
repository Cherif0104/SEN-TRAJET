"use client";

import { useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { formatFcfa, getSentrajetTariffs, type SentrajetTariff } from "@/lib/sentrajetPricing";

export default function AdminTarificationPage() {
  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);

  useEffect(() => {
    void getSentrajetTariffs().then(setTariffs);
  }, []);

  const client = tariffs.filter((t) => t.segment === "client");
  const partner = tariffs.filter((t) => t.segment === "partner");

  return (
    <>
      <SjSectionHead eyebrow="Rules Engine" title="Tarification paramétrable" />
      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Client direct</h3>
          <div className="sj-list">
            {client.map((t) => (
              <div key={`${t.segment}-${t.rule_key}`} className="sj-row">
                <span>{t.label}</span>
                <b className="sj-gold">
                  {formatFcfa(t.amount_fcfa)}
                  {t.unit === "per_km" ? "/km" : ""}
                </b>
              </div>
            ))}
          </div>
        </SjCard>
        <SjCard>
          <h3>Partenaire B2B validé</h3>
          <div className="sj-list">
            {partner.map((t) => (
              <div key={`${t.segment}-${t.rule_key}`} className="sj-row">
                <span>{t.label}</span>
                <b className="sj-gold">
                  {formatFcfa(t.amount_fcfa)}
                  {t.unit === "per_km" ? "/km" : ""}
                </b>
              </div>
            ))}
          </div>
        </SjCard>
      </div>
      <SjCard style={{ marginTop: 16 }}>
        <h3>Règles opérationnelles</h3>
        <div className="sj-grid sj-grid-3">
          <div>
            <div className="sj-muted">Attente</div>
            <b>30 min gratuites</b>
            <div className="sj-metric-sub">Puis 2 500 F / 30 min</div>
          </div>
          <div>
            <div className="sj-muted">Mise à disposition B2B</div>
            <b>25 000 F + 700 F/km</b>
          </div>
          <div>
            <div className="sj-muted">Annulation</div>
            <b>30% / 50% selon délai</b>
          </div>
        </div>
      </SjCard>
    </>
  );
}
