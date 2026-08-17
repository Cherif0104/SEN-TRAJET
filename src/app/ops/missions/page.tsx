"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
  listPendingPayments,
  type PendingPayment,
  type PlatformBooking,
} from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const ONGOING_STATUSES = ["chauffeur_assigne", "chauffeur_en_route", "chauffeur_arrive", "client_pris_en_charge", "en_cours"];

export default function OpsMissionsPage() {
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listPlatformBookings().catch(() => []), listPendingPayments().catch(() => [])])
      .then(([b, p]) => {
        setBookings(b.filter((row) => ONGOING_STATUSES.includes(row.status)).sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()));
        setPayments(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Opérations" title="Missions en cours" />
      <div className="sj-list">
        {bookings.map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.pickup} → {b.dropoff}</b>
                <div className="sj-muted">
                  {new Date(b.pickup_time).toLocaleString("fr-FR")} ·{" "}
                  {b.service_order?.dispatch?.driver?.full_name || "Chauffeur à confirmer"} ·{" "}
                  {b.service_order?.dispatch?.vehicle ? `${b.service_order.dispatch.vehicle.brand} ${b.service_order.dispatch.vehicle.plate_number}` : "—"}
                </div>
              </div>
              <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!bookings.length ? <SjCard><p className="sj-muted">Aucune mission en cours actuellement.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Paiements à vérifier" />
      <div className="sj-list">
        {payments.map((p) => (
          <SjCard key={p.id}>
            <div className="sj-between">
              <div>
                <b>{p.booking_ref || p.booking_id.slice(0, 8)}</b>
                <div className="sj-muted">{new Date(p.created_at).toLocaleString("fr-FR")}</div>
              </div>
              <SjBadge tone="warning">{p.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!payments.length ? <SjCard><p className="sj-muted">Aucun paiement en attente de vérification.</p></SjCard> : null}
      </div>
    </>
  );
}
