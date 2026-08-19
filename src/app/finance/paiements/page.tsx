"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listAllPayments, markPaymentPaid, type FinancePayment } from "@/lib/financeOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "attente" | "payes" | "tous";

export default function FinancePaiementsPage() {
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("attente");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listAllPayments()
      .then(setPayments)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  async function confirmPaid(id: string) {
    setConfirming(id);
    setError(null);
    try {
      await markPaymentPaid(id);
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "paid", paid_at: new Date().toISOString() } : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de confirmer ce paiement.");
    } finally {
      setConfirming(null);
    }
  }

  const filtered = payments.filter((p) => {
    if (tab === "attente") return ["pending", "initiated", "created"].includes(p.status);
    if (tab === "payes") return p.status === "paid";
    return true;
  });

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Finance" title="Paiements" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {[["attente", "En attente"], ["payes", "Payés"], ["tous", "Tous"]].map(([value, label]) => (
          <button key={value} type="button" className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setTab(value as Tab)}>
            {label}
          </button>
        ))}
      </div>

      <div className="sj-list">
        {filtered.map((p) => (
          <SjCard key={p.id}>
            <div className="sj-between">
              <div>
                <b>{p.booking?.reference || p.booking_ref || p.booking_id.slice(0, 8)}</b>
                <div className="sj-muted">
                  {p.booking?.client?.full_name || p.booking?.client?.company_name || "Client"} ·{" "}
                  {p.booking ? `${p.booking.pickup} → ${p.booking.dropoff}` : "—"}
                </div>
                <div className="sj-muted">
                  {p.provider || "—"} · {new Date(p.created_at).toLocaleString("fr-FR")}
                  {p.paid_at ? ` · payé le ${new Date(p.paid_at).toLocaleDateString("fr-FR")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={p.status === "paid" ? "success" : "warning"}>{p.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 8 }}>{formatFcfa(p.amount_fcfa)}</div>
                {p.status !== "paid" ? (
                  <button
                    type="button"
                    className="sj-btn sj-btn-primary"
                    style={{ marginTop: 8 }}
                    disabled={confirming === p.id}
                    onClick={() => void confirmPaid(p.id)}
                  >
                    {confirming === p.id ? "Confirmation…" : "Marquer payé"}
                  </button>
                ) : null}
              </div>
            </div>
          </SjCard>
        ))}
        {!filtered.length ? <SjCard><p className="sj-muted">Aucun paiement dans cette catégorie.</p></SjCard> : null}
      </div>
    </>
  );
}
