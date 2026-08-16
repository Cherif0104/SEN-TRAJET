"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listIncompleteBookings,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function AdminCrmPage() {
  const [incomplete, setIncomplete] = useState<PlatformBooking[]>([]);
  const [all, setAll] = useState<PlatformBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [a, i] = await Promise.all([listPlatformBookings(), listIncompleteBookings()]);
        setAll(a);
        setIncomplete(i);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur CRM");
      }
    })();
  }, []);

  const byClient = new Map<string, { name: string; phone: string; count: number }>();
  for (const b of all) {
    const key = b.client_id || b.client?.phone || "anonyme";
    const prev = byClient.get(key) || {
      name: b.client?.company_name || b.client?.full_name || "Prospect",
      phone: b.client?.phone || "—",
      count: 0,
    };
    prev.count += 1;
    byClient.set(key, prev);
  }

  return (
    <>
      <SjSectionHead
        eyebrow="CRM"
        title="Demandes & historique"
        action={
          <Link href="/admin/clients" className="sj-btn">
            Fiches clients →
          </Link>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Suivi des réservations non finalisées (paiement / abandon) et historique global.
      </p>

      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}

      <div className="sj-grid sj-grid-3" style={{ marginBottom: 16 }}>
        <SjCard>
          <div className="sj-muted">Réservations totales</div>
          <div className="sj-metric">{all.length}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Non finalisées</div>
          <div className="sj-metric">{incomplete.length}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Clients / prospects</div>
          <div className="sj-metric">{byClient.size}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Pipeline — non finalisées" />
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Trajet</th>
                <th>Créée</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {incomplete.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.reference || b.id.slice(0, 8)}</b>
                  </td>
                  <td>
                    {b.client?.full_name || b.client?.company_name || "—"}
                    <div className="sj-muted">{b.client?.phone || "—"}</div>
                  </td>
                  <td>
                    {b.pickup} → {b.dropoff}
                  </td>
                  <td>{new Date(b.created_at).toLocaleString("fr-FR")}</td>
                  <td>{b.estimated_price != null ? formatFcfa(b.estimated_price) : "—"}</td>
                  <td>
                    <SjBadge tone={bookingStatusTone(b.status)}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </SjBadge>
                  </td>
                </tr>
              ))}
              {!incomplete.length ? (
                <tr>
                  <td colSpan={6} className="sj-muted">
                    Aucune demande en attente.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SjCard>

      <SjSectionHead title="Historique clients (volume)" />
      <div className="sj-grid sj-grid-3">
        {[...byClient.entries()].slice(0, 24).map(([key, c]) => (
          <SjCard key={key}>
            <h3>{c.name}</h3>
            <div className="sj-muted">{c.phone}</div>
            <div className="sj-metric" style={{ marginTop: 10 }}>
              {c.count}
            </div>
            <div className="sj-metric-sub">demande(s)</div>
          </SjCard>
        ))}
      </div>
    </>
  );
}
