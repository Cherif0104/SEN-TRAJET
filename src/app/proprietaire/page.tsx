"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { getMyOwnerRecord, listMyVehicleContracts, type OwnerVehicleContract } from "@/lib/ownerOps";
import { loadEntity360 } from "@/lib/entity360";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function contractTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "active") return "success";
  if (status === "pending" || status === "en_validation") return "warning";
  if (status === "suspended" || status === "terminated") return "danger";
  return "info";
}

export default function ProprietaireHomePage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<OwnerVehicleContract[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<{ label: string; expiresAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOwnerRecord, setHasOwnerRecord] = useState<boolean | null>(null);
  const [minMonthly, setMinMonthly] = useState(500000);

  useEffect(() => {
    void listBusinessRules("vehicle_partner").then((rules) => {
      setMinMonthly(ruleNumber(rules, "vehicle_partner", "min_monthly_fcfa", 500000));
    });
  }, []);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        setHasOwnerRecord(Boolean(owner));
        if (!owner) return;
        const rows = await listMyVehicleContracts(owner.id).catch(() => []);
        setContracts(rows);

        const alerts: { label: string; expiresAt: string }[] = [];
        const documentSets = await Promise.all([
          loadEntity360("asset_partner", owner.id).catch(() => null),
          ...rows.filter((r) => r.vehicle_id).map((r) => loadEntity360("vehicle", r.vehicle_id as string).catch(() => null)),
        ]);
        for (const set of documentSets) {
          if (!set) continue;
          for (const doc of set.documents) {
            if (!doc.expires_at) continue;
            const days = (new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (days <= 30) alerts.push({ label: doc.name, expiresAt: doc.expires_at });
          }
        }
        setExpiringDocs(alerts);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const activeContracts = contracts.filter((c) => c.status === "active");
  const inService = contracts.filter((c) => c.vehicle?.status === "in_service" || c.vehicle?.status === "on_trip");
  const inMaintenance = contracts.filter((c) => c.vehicle?.status === "maintenance");
  const monthlyTotal = useMemo(
    () => activeContracts.reduce((sum, c) => sum + Number(c.monthly_amount_fcfa || 0), 0),
    [activeContracts]
  );

  if (loading) return <BrandedLoader />;

  if (hasOwnerRecord === false) {
    return (
      <>
        <div className="sj-hero">
          <section className="sj-hero-card">
            <div className="sj-hero-art" />
            <div className="sj-hero-copy">
              <div className="sj-eyebrow">SentraJet Vehicle Partner</div>
              <h1>Votre véhicule travaille. Nous nous occupons du reste.</h1>
              <p>
                Confiez l’exploitation de votre véhicule premium à SentraJet dans le cadre d’un contrat
                d’exploitation. Condition d’entrée à partir de{" "}
                <strong>{minMonthly.toLocaleString("fr-FR")} FCFA/mois</strong> selon le véhicule et les
                modalités contractuelles — ce n’est pas un rendement garanti.
              </p>
              <a className="sj-btn sj-btn-primary" href="https://wa.me/221788324069" target="_blank" rel="noreferrer">
                Contacter SentraJet — Propriétaires
              </a>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SjSectionHead eyebrow="Espace partenaire / financeur" title="Accueil" />

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Véhicules</div>
          <div className="sj-metric">{contracts.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En service</div>
          <div className="sj-metric">{inService.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En maintenance</div>
          <div className="sj-metric">{inMaintenance.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Échéances à surveiller</div>
          <div className="sj-metric">{expiringDocs.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-muted">Revenu contractuel mensuel</div>
        <div className="sj-metric sj-gold">{formatFcfa(monthlyTotal)}</div>
        <div className="sj-metric-sub">
          Selon {activeContracts.length} contrat{activeContracts.length > 1 ? "s" : ""} d’exploitation actif
          {activeContracts.length > 1 ? "s" : ""} — pas une estimation de chiffre d’affaires plateforme.
        </div>
      </SjCard>

      {expiringDocs.length ? (
        <>
          <SjSectionHead title="Alertes" />
          <div className="sj-list">
            {expiringDocs.map((d, i) => (
              <SjCard key={`${d.label}-${i}`}>
                <div className="sj-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                    <span>{d.label}</span>
                  </div>
                  <span className="sj-muted">
                    Expire le {new Date(d.expiresAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </SjCard>
            ))}
          </div>
        </>
      ) : null}

      <SjSectionHead
        title="Mes véhicules"
        action={
          <Link href="/proprietaire/vehicule" className="sj-btn sj-btn-ghost">
            Voir tout →
          </Link>
        }
      />
      <div className="sj-list">
        {contracts.map((c) => (
          <Link key={c.id} href={c.vehicle_id ? `/proprietaire/vehicule/${c.vehicle_id}` : "/proprietaire/vehicule"}>
            <SjCard>
              <div className="sj-between">
                <div>
                  <b>{c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : c.vehicle_label}</b>
                  <div className="sj-muted">{c.vehicle?.plate_number || "—"}</div>
                </div>
                <SjBadge tone={contractTone(c.status)}>{c.status}</SjBadge>
              </div>
            </SjCard>
          </Link>
        ))}
        {!contracts.length ? <SjCard><p className="sj-muted">Aucun véhicule rattaché pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
