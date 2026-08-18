"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { COMPLAINT_CATEGORIES, listAllComplaints, updateComplaintStatus, type Complaint } from "@/lib/ratingsAndComplaints";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const STATUS_LABELS: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "En cours",
  resolue: "Résolue",
  rejetee: "Rejetée",
};

const CATEGORY_LABELS = Object.fromEntries(COMPLAINT_CATEGORIES);

function complaintTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "resolue") return "success";
  if (status === "rejetee") return "danger";
  if (status === "en_cours") return "info";
  return "warning";
}

export default function OpsReclamationsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void listAllComplaints()
      .then(setComplaints)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  async function changeStatus(complaint: Complaint, status: string) {
    setUpdating(complaint.id);
    try {
      await updateComplaintStatus(complaint.id, status);
      setComplaints((prev) => prev.map((c) => (c.id === complaint.id ? { ...c, status } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour cette réclamation.");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <BrandedLoader />;

  const open = complaints.filter((c) => c.status === "ouverte" || c.status === "en_cours");
  const closed = complaints.filter((c) => c.status === "resolue" || c.status === "rejetee");

  return (
    <>
      <SjSectionHead eyebrow="Opérations" title="Réclamations" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <SjSectionHead title={`À traiter (${open.length})`} />
      <div className="sj-list">
        {open.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{CATEGORY_LABELS[c.category] ?? c.category}</b>
                <div className="sj-muted">{c.message}</div>
                <div className="sj-muted">{new Date(c.created_at).toLocaleString("fr-FR")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={complaintTone(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</SjBadge>
                <select
                  value={c.status}
                  onChange={(e) => void changeStatus(c, e.target.value)}
                  disabled={updating === c.id}
                  style={{ marginTop: 8, display: "block" }}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </SjCard>
        ))}
        {!open.length ? <SjCard><p className="sj-muted">Aucune réclamation en attente.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Traitées" />
      <div className="sj-list">
        {closed.slice(0, 10).map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{CATEGORY_LABELS[c.category] ?? c.category}</b>
                <div className="sj-muted">{c.message}</div>
              </div>
              <SjBadge tone={complaintTone(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!closed.length ? <SjCard><p className="sj-muted">Aucune réclamation traitée pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
