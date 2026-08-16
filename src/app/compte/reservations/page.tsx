"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  ensureClientForUser,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function CompteReservationsPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const clientId = await ensureClientForUser({
        userId: user.id,
        fullName: profile?.full_name,
        phone: profile?.phone,
        email: user.email,
      });
      const all = await listPlatformBookings();
      setRows(all.filter((b) => b.client_id === clientId));
    })();
  }, [user, profile]);

  return (
    <>
      <SjSectionHead
        title="Mes réservations"
        action={
          <Link href="/reserver" className="sj-btn sj-btn-primary">
            + Réserver
          </Link>
        }
      />
      <div className="sj-list">
        {rows.map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.reference || b.id.slice(0, 8)}</b>
                <div className="sj-muted">
                  {b.pickup} → {b.dropoff}
                </div>
                <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
                <div style={{ marginTop: 8 }}>
                  Chauffeur : {b.service_order?.dispatch?.driver?.full_name || "En cours d’affectation"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(b.status)}>
                  {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                </SjBadge>
                <div className="sj-gold" style={{ marginTop: 10 }}>
                  {b.estimated_price != null ? formatFcfa(Number(b.estimated_price)) : "Sur devis"}
                </div>
              </div>
            </div>
          </SjCard>
        ))}
        {!rows.length ? <SjCard><p className="sj-muted">Aucune réservation pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
