"use client";

import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { useClientBookings } from "@/hooks/useClientBookings";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function CompteReservationsPage() {
  const { rows, loading, error } = useClientBookings();

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
      {error ? (
        <p role="alert" className="mb-4 text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {loading ? <BrandedLoader /> : null}
      {!loading ? <div className="sj-list">
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
      </div> : null}
    </>
  );
}
