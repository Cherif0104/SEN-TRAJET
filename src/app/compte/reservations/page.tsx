"use client";

import { useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  CLIENT_CANCELLED_STATUSES,
  CLIENT_TERMINAL_STATUSES,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { useClientBookings } from "@/hooks/useClientBookings";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "a_venir" | "passees" | "annulees";

export default function CompteReservationsPage() {
  const { rows, loading, error } = useClientBookings();
  const [tab, setTab] = useState<Tab>("a_venir");

  const filtered = rows.filter((b) => {
    if (tab === "passees") return CLIENT_TERMINAL_STATUSES.includes(b.status);
    if (tab === "annulees") return CLIENT_CANCELLED_STATUSES.includes(b.status);
    return !CLIENT_TERMINAL_STATUSES.includes(b.status) && !CLIENT_CANCELLED_STATUSES.includes(b.status);
  });

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
      <div className="sj-toolbar" style={{ marginBottom: 16 }}>
        {(
          [
            ["a_venir", "À venir", rows.filter((b) => !CLIENT_TERMINAL_STATUSES.includes(b.status) && !CLIENT_CANCELLED_STATUSES.includes(b.status)).length],
            ["passees", "Passées", rows.filter((b) => CLIENT_TERMINAL_STATUSES.includes(b.status)).length],
            ["annulees", "Annulées", rows.filter((b) => CLIENT_CANCELLED_STATUSES.includes(b.status)).length],
          ] as [Tab, string, number][]
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"}
            onClick={() => setTab(value)}
          >
            {label} ({count})
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((b) => (
            <Link key={b.id} href={`/compte/reservations/${b.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div>
                    <b>
                      {b.pickup} → {b.dropoff}
                    </b>
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
            </Link>
          ))}
          {!filtered.length ? (
            <SjCard>
              <p className="sj-muted">Aucune réservation dans cette catégorie.</p>
            </SjCard>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
