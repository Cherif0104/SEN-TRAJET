"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { getMyOwnerRecord, listMyVehicleContracts } from "@/lib/ownerOps";
import { loadEntity360, type EntityFinancialRecord } from "@/lib/entity360";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function recordTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "pending" || status === "sent") return "warning";
  return "info";
}

function recordLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    sent: "Envoyé",
    overdue: "En retard",
    cancelled: "Annulé",
  };
  return labels[status] ?? status;
}

type Row = EntityFinancialRecord & { vehicleLabel: string };

export default function ProprietaireRevenusPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [activeMonthly, setActiveMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        if (!owner) return;
        const contracts = await listMyVehicleContracts(owner.id).catch(() => []);
        setActiveMonthly(
          contracts.filter((c) => c.status === "active").reduce((s, c) => s + Number(c.monthly_amount_fcfa || 0), 0)
        );

        const ownerRecords = await loadEntity360("asset_partner", owner.id).catch(() => null);
        const vehicleResults = await Promise.all(
          contracts
            .filter((c) => c.vehicle_id)
            .map(async (c) => ({
              label: c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : c.vehicle_label,
              data: await loadEntity360("vehicle", c.vehicle_id as string).catch(() => null),
            }))
        );

        const all: Row[] = [];
        if (ownerRecords) {
          for (const r of ownerRecords.financialRecords) all.push({ ...r, vehicleLabel: "Compte partenaire" });
        }
        for (const v of vehicleResults) {
          if (!v.data) continue;
          for (const r of v.data.financialRecords) all.push({ ...r, vehicleLabel: v.label });
        }
        all.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
        setRows(all);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Financeur" title="Mes revenus" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Montants réels issus des écritures enregistrées par SentraJet — aucune estimation ni rentabilité
        projetée n’est affichée ici.
      </p>

      <SjCard style={{ marginBottom: 16 }}>
        <div className="sj-muted">Référence contractuelle mensuelle (contrats actifs)</div>
        <div className="sj-metric sj-gold">{formatFcfa(activeMonthly)}</div>
        <div className="sj-metric-sub">Montant prévu par contrat — pas un paiement confirmé</div>
      </SjCard>

      <div className="sj-list">
        {rows.map((r) => (
          <SjCard key={r.id}>
            <div className="sj-between">
              <div>
                <b>{r.label || r.reference}</b>
                <div className="sj-muted">
                  {r.vehicleLabel} · {new Date(r.issue_date).toLocaleDateString("fr-FR")}
                  {r.due_date ? ` · échéance ${new Date(r.due_date).toLocaleDateString("fr-FR")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={recordTone(r.status)}>{recordLabel(r.status)}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 10 }}>{formatFcfa(r.amount_fcfa)}</div>
              </div>
            </div>
          </SjCard>
        ))}
        {!rows.length ? (
          <SjCard>
            <p className="sj-muted">
              Aucune écriture financière pour le moment. Vos paiements apparaîtront ici dès leur
              enregistrement par SentraJet.
            </p>
          </SjCard>
        ) : null}
      </div>
    </>
  );
}
