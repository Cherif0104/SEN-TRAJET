"use client";

import { useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { useClientBookings } from "@/hooks/useClientBookings";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "a_venir" | "passees" | "annulees";

const TERMINAL_OK = ["terminee"];
const CANCELLED = ["annulee_client", "annulee_sentrajet", "remboursee", "remboursement_en_cours", "no_show"];

export default function CompteReservationsPage() {
  const { rows, loading, error } = useClientBookings();
  const [tab, setTab] = useState<Tab>("a_venir");

  const filtered = rows.filter((b) => {
    if (tab === "passees") return TERMINAL_OK.includes(b.status);
    if (tab === "annulees") return CANCELLED.includes(b.status);
    return !TERMINAL_OK.includes(b.status) && !CANCELLED.includes(b.status);
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
        {[
          ["a_venir", "À venir"],
          ["passees", "Passées"],
          ["annulees", "Annulées"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "sj-btn sj-btn-primary" : "sj-btn"}
            onClick={() => setTab(value as Tab)}
          >
            {label}
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
