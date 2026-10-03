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
import {
  listVipQuoteRequests,
  updateVipQuoteRequest,
  type VipQuoteRequest,
} from "@/lib/vipService";

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
  const [vipRows, setVipRows] = useState<VipQuoteRequest[]>([]);
  const [selected, setSelected] = useState<PlatformBooking | null>(null);
  const [selectedVip, setSelectedVip] = useState<VipQuoteRequest | null>(null);
  const [vipQuoteAmount, setVipQuoteAmount] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const [all, vip] = await Promise.all([listPlatformBookings(), listVipQuoteRequests()]);
    setRows(
      all
        .filter((b) => PENDING_STATUSES.includes(b.status))
        .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime())
    );
    setVipRows(vip);
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

  async function runVip(status: string) {
    if (!selectedVip) return;
    setSaving(true);
    setError(null);
    try {
      const amount = vipQuoteAmount.trim() ? Number(vipQuoteAmount) : null;
      await updateVipQuoteRequest(selectedVip.id, {
        status,
        quotedAmountFcfa: amount != null && Number.isFinite(amount) ? amount : null,
      });
      setMessage(`Devis VIP ${selectedVip.reference} mis à jour.`);
      setSelectedVip(null);
      setVipQuoteAmount("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mise à jour impossible");
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

      <SjSectionHead eyebrow="VIP & groupes" title="Offres spéciales à chiffrer" />
      <div className="sj-list" style={{ marginBottom: 24 }}>
        {vipRows.map((request) => (
          <SjCard key={request.id}>
            <div className="sj-between">
              <div>
                <b>{request.reference} · {request.organization_name || request.requester_type}</b>
                <div className="sj-muted">
                  {request.passengers} passagers · {new Date(request.starts_at).toLocaleDateString("fr-FR")} → {new Date(request.ends_at).toLocaleDateString("fr-FR")}
                </div>
                <div className="sj-muted">
                  {request.pickup_location} · préférence {request.vehicle_preference}
                </div>
                <div className="sj-gold" style={{ marginTop: 6 }}>
                  {request.fleet_recommendation.ownedVehiclesCount} véhicules internes / {request.fleet_recommendation.externalPlan.units} renforts estimés
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge>{request.status.replaceAll("_", " ")}</SjBadge>
                <button type="button" className="sj-btn sj-btn-primary" style={{ marginTop: 8 }} onClick={() => setSelectedVip(request)}>
                  Chiffrer
                </button>
              </div>
            </div>
          </SjCard>
        ))}
        {!vipRows.length ? <SjCard><p className="sj-muted">Aucune offre spéciale VIP en attente.</p></SjCard> : null}
      </div>

      {selectedVip ? (
        <SjCard style={{ marginBottom: 24 }}>
          <h3>{selectedVip.reference} · {selectedVip.passengers} passagers</h3>
          <p className="sj-muted">
            Capacité interne : {selectedVip.fleet_recommendation.ownedSeatsAvailable} places · reste à couvrir : {selectedVip.fleet_recommendation.additionalPassengersToCover}
          </p>
          <div className="sj-field" style={{ marginTop: 12 }}>
            <label>Montant du devis final (FCFA)</label>
            <input type="number" value={vipQuoteAmount} onChange={(event) => setVipQuoteAmount(event.target.value)} placeholder="Ex. 850000" />
          </div>
          <div className="sj-toolbar" style={{ marginTop: 14, justifyContent: "flex-start" }}>
            <button type="button" className="sj-btn" disabled={saving} onClick={() => void runVip("en_etude")}>Mettre en étude</button>
            <button type="button" className="sj-btn sj-btn-primary" disabled={saving || !vipQuoteAmount} onClick={() => void runVip("devis_envoye")}>Envoyer le devis</button>
            <button type="button" className="sj-btn" disabled={saving} onClick={() => void runVip("refusee")}>Refuser</button>
            <button type="button" className="sj-btn" onClick={() => setSelectedVip(null)}>Fermer</button>
          </div>
        </SjCard>
      ) : null}

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
