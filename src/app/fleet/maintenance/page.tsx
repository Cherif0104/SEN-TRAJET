"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listAllMaintenanceRecords, type FleetMaintenanceRecord } from "@/lib/fleetOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "planifie" | "termine" | "tous";

function maintenanceTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "completed") return "success";
  if (status === "scheduled") return "info";
  if (status === "in_progress") return "warning";
  return "danger";
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Terminé",
  scheduled: "Planifié",
  in_progress: "En cours",
  cancelled: "Annulé",
};

export default function FleetMaintenancePage() {
  const [records, setRecords] = useState<FleetMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("planifie");

  useEffect(() => {
    void listAllMaintenanceRecords()
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (tab === "planifie") return ["scheduled", "in_progress"].includes(r.status);
    if (tab === "termine") return r.status === "completed";
    return true;
  });

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Fleet Manager" title="Entretien de la flotte" />
      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {[["planifie", "À venir"], ["termine", "Terminés"], ["tous", "Tous"]].map(([value, label]) => (
          <button key={value} type="button" className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setTab(value as Tab)}>
            {label}
          </button>
        ))}
      </div>

      <div className="sj-list">
        {filtered.map((r) => (
          <Link key={r.id} href={`/admin/vehicules/${r.vehicle_id}`}>
            <SjCard>
              <div className="sj-between">
                <div>
                  <b>{r.title}</b>
                  <div className="sj-muted">
                    {r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model} · ${r.vehicle.plate_number}` : "Véhicule"} · {r.maintenance_type}
                  </div>
                  <div className="sj-muted">
                    {r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString("fr-FR") : "Date à définir"}
                    {r.next_due_at ? ` · prochaine échéance ${new Date(r.next_due_at).toLocaleDateString("fr-FR")}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={maintenanceTone(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</SjBadge>
                  {r.cost_fcfa != null ? <div className="sj-muted" style={{ marginTop: 8 }}>{formatFcfa(r.cost_fcfa)}</div> : null}
                </div>
              </div>
            </SjCard>
          </Link>
        ))}
        {!filtered.length ? <SjCard><p className="sj-muted">Aucun entretien dans cette catégorie.</p></SjCard> : null}
      </div>
    </>
  );
}
