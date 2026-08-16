"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { SERVICE_TYPE_LABELS, formatFcfa, type ServiceType } from "@/lib/sentrajetPricing";

export default function AdminReservationsPage() {
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await listPlatformBookings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <SjSectionHead
        eyebrow="Operations"
        title="Réservations"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Fermer" : "+ Nouvelle réservation"}
          </button>
        }
      />

      {showForm ? (
        <SjCard style={{ marginBottom: 16 }}>
          <BookingForm segment="client" onCreated={() => void load()} />
        </SjCard>
      ) : null}

      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}

      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Prestation</th>
                <th>Date</th>
                <th>Passagers</th>
                <th>Chauffeur</th>
                <th>Statut</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.reference || r.id.slice(0, 8)}</b>
                  </td>
                  <td>{r.client?.company_name || r.client?.full_name || "—"}</td>
                  <td>
                    {SERVICE_TYPE_LABELS[r.service_type as ServiceType] || r.service_type}
                    <div className="sj-muted">
                      {r.pickup} → {r.dropoff}
                    </div>
                  </td>
                  <td>{new Date(r.pickup_time).toLocaleString("fr-FR")}</td>
                  <td>{r.passengers}</td>
                  <td>{r.service_order?.dispatch?.driver?.full_name || "À assigner"}</td>
                  <td>
                    <SjBadge tone={bookingStatusTone(r.status)}>
                      {BOOKING_STATUS_LABEL[r.status] ?? r.status}
                    </SjBadge>
                  </td>
                  <td>
                    <b>{r.estimated_price != null ? formatFcfa(Number(r.estimated_price)) : "Sur devis"}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? <p className="sj-muted" style={{ marginTop: 12 }}>Aucune réservation.</p> : null}
      </SjCard>

      <div style={{ marginTop: 16 }}>
        <Link href="/admin/dispatch" className="sj-btn">
          Aller au dispatch →
        </Link>
      </div>
    </>
  );
}
