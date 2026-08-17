"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listPartnerInvoices, type PartnerInvoice } from "@/lib/partnerClients";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function invoiceTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent" || status === "pending") return "warning";
  return "info";
}

function invoiceLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: "Payée",
    pending: "En attente",
    sent: "Envoyée",
    overdue: "En retard",
    cancelled: "Annulée",
    draft: "Brouillon",
  };
  return labels[status] ?? status;
}

export default function PartenaireFacturesPage() {
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listPartnerInvoices()
      .then(setInvoices)
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les factures."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Facturation" title="Mes factures" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
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
                  <SjBadge tone={invoiceTone(inv.status)}>{invoiceLabel(inv.status)}</SjBadge>
                  <div className="sj-gold" style={{ marginTop: 10 }}>
                    {inv.amount_ttc != null ? formatFcfa(Number(inv.amount_ttc)) : "—"}
                  </div>
                </div>
              </div>
            </SjCard>
          ))}
          {!invoices.length ? (
            <SjCard>
              <p className="sj-muted">
                Aucune facture pour le moment. Vos factures apparaîtront ici après émission par SentraJet.
              </p>
            </SjCard>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
