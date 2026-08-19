"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listAllPayments, listAllInvoices, listAllVehicleContracts, type FinancePayment, type FinanceInvoice, type FinanceVehicleContract } from "@/lib/financeOps";
import { listPartnerContracts, type PartnerContract } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const PENDING_PAYMENT_STATUSES = ["pending", "initiated", "created"];

export default function FinanceHomePage() {
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [vehicleContracts, setVehicleContracts] = useState<FinanceVehicleContract[]>([]);
  const [partnerContracts, setPartnerContracts] = useState<PartnerContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      listAllPayments().catch(() => []),
      listAllInvoices().catch(() => []),
      listAllVehicleContracts().catch(() => []),
      listPartnerContracts().catch(() => []),
    ])
      .then(([p, i, vc, pc]) => {
        setPayments(p);
        setInvoices(i);
        setVehicleContracts(vc);
        setPartnerContracts(pc);
      })
      .finally(() => setLoading(false));
  }, []);

  const encaisse = useMemo(() => payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_fcfa, 0), [payments]);
  const attendu = useMemo(() => payments.filter((p) => PENDING_PAYMENT_STATUSES.includes(p.status)).reduce((s, p) => s + p.amount_fcfa, 0), [payments]);
  const enRetard = useMemo(() => invoices.filter((i) => i.status === "overdue"), [invoices]);
  const enRetardMontant = useMemo(() => enRetard.reduce((s, i) => s + Number(i.amount_ttc || 0), 0), [enRetard]);
  const activeVehicleContracts = vehicleContracts.filter((c) => c.status === "active");
  const aPayerProprietaires = activeVehicleContracts.reduce((s, c) => s + c.monthly_amount_fcfa, 0);
  const activePartnerContracts = partnerContracts.filter((c) => c.status === "active");

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Espace Finance" title="Accueil" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Tous les montants ci-dessous proviennent des paiements et factures réels — aucune estimation
        n’est présentée comme un chiffre encaissé.
      </p>

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Encaissé</div>
          <div className="sj-metric sj-gold">{formatFcfa(encaisse)}</div>
          <div className="sj-metric-sub">{payments.filter((p) => p.status === "paid").length} paiements confirmés</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Attendu</div>
          <div className="sj-metric">{formatFcfa(attendu)}</div>
          <div className="sj-metric-sub">{payments.filter((p) => PENDING_PAYMENT_STATUSES.includes(p.status)).length} paiements en attente</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En retard</div>
          <div className="sj-metric" style={{ color: enRetard.length ? "var(--color-error)" : undefined }}>{formatFcfa(enRetardMontant)}</div>
          <div className="sj-metric-sub">{enRetard.length} facture{enRetard.length !== 1 ? "s" : ""} en retard</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">À payer (propriétaires)</div>
          <div className="sj-metric">{formatFcfa(aPayerProprietaires)}</div>
          <div className="sj-metric-sub">{activeVehicleContracts.length} contrat{activeVehicleContracts.length !== 1 ? "s" : ""} d’exploitation actif{activeVehicleContracts.length !== 1 ? "s" : ""}</div>
        </SjCard>
      </div>

      <div className="sj-grid sj-grid-2" style={{ marginTop: 16 }}>
        <SjCard>
          <div className="sj-muted">Contrats commerciaux actifs (prestataires)</div>
          <div className="sj-metric">{activePartnerContracts.length.toString().padStart(2, "0")}</div>
          <Link href="/finance/contrats" className="sj-gold" style={{ display: "inline-block", marginTop: 6 }}>Voir les contrats →</Link>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Factures</div>
          <div className="sj-metric">{invoices.length.toString().padStart(2, "0")}</div>
          <Link href="/finance/factures" className="sj-gold" style={{ display: "inline-block", marginTop: 6 }}>Voir les factures →</Link>
        </SjCard>
      </div>

      <SjSectionHead
        title="Paiements récents"
        action={<Link href="/finance/paiements" className="sj-btn sj-btn-ghost">Voir tout →</Link>}
      />
      <div className="sj-list">
        {payments.slice(0, 6).map((p) => (
          <SjCard key={p.id}>
            <div className="sj-between">
              <div>
                <b>{p.booking?.reference || p.booking_ref || p.booking_id.slice(0, 8)}</b>
                <div className="sj-muted">
                  {p.booking?.client?.full_name || p.booking?.client?.company_name || "Client"} · {new Date(p.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={p.status === "paid" ? "success" : "warning"}>{p.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 8 }}>{formatFcfa(p.amount_fcfa)}</div>
              </div>
            </div>
          </SjCard>
        ))}
        {!payments.length ? <SjCard><p className="sj-muted">Aucun paiement enregistré.</p></SjCard> : null}
      </div>
    </>
  );
}
