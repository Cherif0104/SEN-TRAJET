"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listDriverDocuments, updateDriverDocumentStatus, type RhDriverDocument } from "@/lib/rhOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "attente" | "valides" | "tous";

function docTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "approved" || status === "verified") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  verified: "Vérifié",
  rejected: "Rejeté",
};

export default function RhDocumentsPage() {
  const [documents, setDocuments] = useState<RhDriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("attente");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listDriverDocuments()
      .then(setDocuments)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  async function review(doc: RhDriverDocument, status: string) {
    setUpdating(doc.id);
    setError(null);
    try {
      await updateDriverDocumentStatus(doc.id, status);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status, reviewed_at: new Date().toISOString() } : d)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour ce document.");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = documents.filter((d) => {
    if (tab === "attente") return d.status === "pending";
    if (tab === "valides") return ["approved", "verified"].includes(d.status);
    return true;
  });

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="RH" title="Documents chauffeurs" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {[["attente", "En attente"], ["valides", "Validés"], ["tous", "Tous"]].map(([value, label]) => (
          <button key={value} type="button" className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setTab(value as Tab)}>
            {label}
          </button>
        ))}
      </div>

      <div className="sj-list">
        {filtered.map((doc) => (
          <SjCard key={doc.id}>
            <div className="sj-between">
              <div>
                <b>{doc.driver?.full_name || "Chauffeur"}</b>
                <div className="sj-muted">{doc.doc_type} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}</div>
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="sj-gold">
                  Voir le document
                </a>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={docTone(doc.status)}>{STATUS_LABELS[doc.status] ?? doc.status}</SjBadge>
                {doc.status === "pending" ? (
                  <div className="sj-toolbar" style={{ marginTop: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="sj-btn" disabled={updating === doc.id} onClick={() => void review(doc, "rejected")}>
                      Rejeter
                    </button>
                    <button type="button" className="sj-btn sj-btn-primary" disabled={updating === doc.id} onClick={() => void review(doc, "approved")}>
                      Approuver
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </SjCard>
        ))}
        {!filtered.length ? <SjCard><p className="sj-muted">Aucun document dans cette catégorie.</p></SjCard> : null}
      </div>
    </>
  );
}
