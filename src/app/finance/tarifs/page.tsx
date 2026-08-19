"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { loadTariffCatalog } from "@/lib/engines/tariffCatalog";
import type { TariffRule } from "@/lib/engines/tariffDefaults";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function ruleAmount(r: TariffRule): string {
  if (r.pricingMode === "manual") return "Sur devis";
  if (r.pricingMode === "per_km") return `${r.pricePerKmFcfa?.toLocaleString("fr-FR")} F/km`;
  if (r.pricingMode === "forfait_plus_extra_km") {
    return `${formatFcfa(r.basePriceFcfa)} + ${r.extraKmPriceFcfa?.toLocaleString("fr-FR")} F/km au-delà de ${r.includedDistanceKm} km`;
  }
  return formatFcfa(r.basePriceFcfa);
}

export default function FinanceTarifsPage() {
  const [publicRules, setPublicRules] = useState<TariffRule[]>([]);
  const [partnerRules, setPartnerRules] = useState<TariffRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([loadTariffCatalog("public"), loadTariffCatalog("partner")])
      .then(([pub, part]) => {
        setPublicRules(pub);
        setPartnerRules(part);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead
        eyebrow="Finance"
        title="Tarifs"
        action={
          <Link href="/admin/regles" className="sj-btn">
            Modifier les règles →
          </Link>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Catalogue actif tel que consommé par le moteur de tarification (base de données, pas une
        grille figée dans le code).
      </p>

      <SjSectionHead title="Grille client direct" />
      <div className="sj-list">
        {publicRules.map((r) => (
          <SjCard key={r.ruleKey}>
            <div className="sj-between">
              <div>
                <b>{r.label}</b>
                <div className="sj-muted">{r.serviceFamily} · {r.zone}</div>
              </div>
              <div className="sj-gold">{ruleAmount(r)}</div>
            </div>
          </SjCard>
        ))}
        {!publicRules.length ? <SjCard><p className="sj-muted">Aucune règle publique active.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Grille partenaire B2B" />
      <div className="sj-list">
        {partnerRules.map((r) => (
          <SjCard key={r.ruleKey}>
            <div className="sj-between">
              <div>
                <b>{r.label}</b>
                <div className="sj-muted">{r.serviceFamily} · {r.zone}</div>
              </div>
              <div className="sj-gold">{ruleAmount(r)}</div>
            </div>
          </SjCard>
        ))}
        {!partnerRules.length ? <SjCard><p className="sj-muted">Aucune règle partenaire active.</p></SjCard> : null}
      </div>
    </>
  );
}
