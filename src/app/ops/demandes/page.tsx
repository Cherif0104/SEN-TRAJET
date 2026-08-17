"use client";

import { useCallback, useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
  updateBookingWorkflowStatus,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

const PENDING_STATUSES = [
  "demande_recue",
  "demande",
  "info_demandee",
  "devis_envoye",
  "devis_accepte",
  "en_attente_de_paiement",
  "nouvelle",
];

export default function OpsDemandesPage() {
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [selected, setSelected] = useState<PlatformBooking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const all = await listPlatformBookings();
    setRows(
      all
        .filter((b) => PENDING_STATUSES.includes(b.status))
        .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime())
    );
  }, []);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [reload]);

  async function run(toStatus: string, defaultNote: string) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const amount = quoteAmount.trim() === "" ? null : Number(quoteAmount);
      await updateBookingWorkflowStatus({
        bookingId: selected.id,
        toStatus,
        note: note.trim() || defaultNote,
        quoteAmountFcfa: amount != null && !Number.isNaN(amount) ? amount : null,
      });
      setMessage(`Statut → ${BOOKING_STATUS_LABEL[toStatus] ?? toStatus}`);
      setSelected(null);
      setQuoteAmount("");
      setNote("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SjSectionHead eyebrow="Opérations" title="Demandes à traiter" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Traitez les demandes par ordre d’heure de prise en charge — les plus urgentes en premier.
      </p>

      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <div className="sj-list">
        {rows.map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.reference || b.id.slice(0, 8)}</b>
                <div className="sj-muted">
                  {b.client?.full_name || b.client?.company_name || "Client"} · {b.pickup} → {b.dropoff}
                </div>
                <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")} · {b.passengers} passagers</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 8 }}>
                  {b.estimated_price != null ? formatFcfa(b.estimated_price) : "Sur devis"}
                </div>
                <button type="button" className="sj-btn sj-btn-primary" style={{ marginTop: 8 }} onClick={() => setSelected(b)}>
                  Traiter
                </button>
              </div>
            </div>
          </SjCard>
        ))}
        {!rows.length ? <SjCard><p className="sj-muted">Aucune demande en attente.</p></SjCard> : null}
      </div>

      {selected ? (
        <SjCard style={{ marginTop: 16 }}>
          <h3>Traiter {selected.reference || selected.id.slice(0, 8)}</h3>
          <p className="sj-muted">
            {selected.pickup} → {selected.dropoff} · {selected.passengers} passagers ·{" "}
            {selected.pricing_segment === "partner" ? "Tarif partenaire B2B" : "Tarif client"}
          </p>
          <div className="sj-form-grid" style={{ marginTop: 12 }}>
            <div className="sj-field">
              <label>Montant devis (FCFA)</label>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder={selected.estimated_price?.toString() || "Ex. 30000"}
              />
            </div>
            <div className="sj-field">
              <label>Note interne</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Commentaire ops…" />
            </div>
          </div>
          <div className="sj-toolbar" style={{ marginTop: 14, justifyContent: "flex-start" }}>
            <button type="button" className="sj-btn sj-btn-primary" disabled={saving} onClick={() => void run("devis_envoye", "Devis envoyé au client")}>
              Envoyer devis
            </button>
            <button type="button" className="sj-btn" disabled={saving} onClick={() => void run("info_demandee", "Informations demandées au client")}>
              Demander infos
            </button>
            <button type="button" className="sj-btn" disabled={saving} onClick={() => void run("en_attente_de_paiement", "Devis accepté — paiement Wave")}>
              Attente paiement
            </button>
            <button type="button" className="sj-btn" disabled={saving} onClick={() => void run("devis_refuse", "Devis refusé / abandon")}>
              Refus / abandon
            </button>
            <button type="button" className="sj-btn" onClick={() => setSelected(null)}>
              Fermer
            </button>
          </div>
        </SjCard>
      ) : null}
    </>
  );
}
