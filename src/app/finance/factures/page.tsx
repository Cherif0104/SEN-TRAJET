"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { createInvoice, listAllInvoices, updateInvoiceStatus, type FinanceInvoice } from "@/lib/financeOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

function invoiceTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "info";
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export default function FinanceFacturesPage() {
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ amountHt: "", taxAmount: "", dueAt: "" });

  useEffect(() => {
    void listAllInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountHt = Number(form.amountHt);
    if (!amountHt || amountHt <= 0) {
      setError("Indiquez un montant HT valide.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createInvoice({
        amountHt,
        taxAmount: form.taxAmount ? Number(form.taxAmount) : 0,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      });
      setInvoices((prev) => [created, ...prev]);
      setForm({ amountHt: "", taxAmount: "", dueAt: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer cette facture.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(invoice: FinanceInvoice, status: string) {
    setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? { ...i, status } : i)));
    try {
      await updateInvoiceStatus(invoice.id, status);
    } catch {
      setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? { ...i, status: invoice.status } : i)));
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead
        eyebrow="Finance"
        title="Factures"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm((v) => !v)}>
            + Nouvelle facture
          </button>
        }
      />

      {showForm ? (
        <SjCard style={{ marginBottom: 16 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Montant HT (FCFA) *</label>
                <input type="number" value={form.amountHt} onChange={(e) => setForm((f) => ({ ...f, amountHt: e.target.value }))} required />
              </div>
              <div className="sj-field">
                <label>Taxe (FCFA)</label>
                <input type="number" value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
              </div>
              <div className="sj-field">
                <label>Échéance</label>
                <input type="date" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} />
              </div>
            </div>
            {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
            <button type="submit" className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Création…" : "Créer la facture"}
            </button>
          </form>
        </SjCard>
      ) : null}

      <div className="sj-list">
        {invoices.map((inv) => (
          <SjCard key={inv.id}>
            <div className="sj-between">
              <div>
                <b>{inv.invoice_number}</b>
                <div className="sj-muted">
                  Émise le {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("fr-FR") : "—"}
                  {inv.due_at ? ` · échéance ${new Date(inv.due_at).toLocaleDateString("fr-FR")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={invoiceTone(inv.status)}>{STATUS_LABELS[inv.status] ?? inv.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 8 }}>{inv.amount_ttc != null ? formatFcfa(Number(inv.amount_ttc)) : "—"}</div>
                <select value={inv.status} onChange={(e) => void changeStatus(inv, e.target.value)} style={{ marginTop: 8, display: "block" }}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </SjCard>
        ))}
        {!invoices.length ? <SjCard><p className="sj-muted">Aucune facture pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
