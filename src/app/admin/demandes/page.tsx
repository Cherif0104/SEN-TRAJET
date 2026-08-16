"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
  updateBookingWorkflowStatus,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function AdminDemandesPage() {
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
        .filter((b) =>
          [
            "demande_recue",
            "demande",
            "info_demandee",
            "devis_envoye",
            "devis_accepte",
            "en_attente_de_paiement",
            "nouvelle",
          ].includes(b.status)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
      <SjSectionHead
        eyebrow="Pipeline"
        title="Demandes reçues"
        action={
          <Link href="/admin/crm" className="sj-btn">
            CRM →
          </Link>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Client demande → SentraJet étudie → devis → paiement → confirmation → dispatch.
      </p>

      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Prestation</th>
                <th>Trajet</th>
                <th>Quand</th>
                <th>Estimation</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.reference || b.id.slice(0, 8)}</b>
                  </td>
                  <td>
                    {b.client?.full_name || b.client?.company_name || "—"}
                    <div className="sj-muted">{b.client?.phone || "—"}</div>
                  </td>
                  <td>{b.service_type}</td>
                  <td>
                    {b.pickup} → {b.dropoff}
                    <div className="sj-muted">{b.passengers} pax · {b.distance_km ?? "?"} km</div>
                  </td>
                  <td>{new Date(b.pickup_time).toLocaleString("fr-FR")}</td>
                  <td>{b.estimated_price != null ? formatFcfa(b.estimated_price) : "Sur devis"}</td>
                  <td>
                    <SjBadge tone={bookingStatusTone(b.status)}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </SjBadge>
                  </td>
                  <td>
                    <button type="button" className="sj-btn sj-btn-primary" onClick={() => setSelected(b)}>
                      Traiter
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="sj-muted">
                    Aucune demande en pipeline.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SjCard>

      {selected ? (
        <SjCard style={{ marginTop: 16 }}>
          <h3>
            Traiter {selected.reference || selected.id.slice(0, 8)}
          </h3>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="sj-btn sj-btn-primary"
              disabled={saving}
              onClick={() => void run("devis_envoye", "Devis envoyé au client")}
            >
              Envoyer devis
            </button>
            <button
              type="button"
              className="sj-btn"
              disabled={saving}
              onClick={() => void run("info_demandee", "Informations demandées au client")}
            >
              Demander infos
            </button>
            <button
              type="button"
              className="sj-btn"
              disabled={saving}
              onClick={() => void run("en_attente_de_paiement", "Devis accepté — paiement Wave")}
            >
              Attente paiement
            </button>
            <button
              type="button"
              className="sj-btn"
              disabled={saving}
              onClick={() => void run("devis_refuse", "Devis refusé / abandon")}
            >
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
