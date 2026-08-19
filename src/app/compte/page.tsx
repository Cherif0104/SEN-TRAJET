"use client";

import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  CLIENT_CANCELLED_STATUSES,
  CLIENT_TERMINAL_STATUSES,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { useClientBookings } from "@/hooks/useClientBookings";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ComptePage() {
  const { profile } = useAuth();
  const { rows, loading, error, refresh } = useClientBookings();

  const upcoming = rows
    .filter((b) => !CLIENT_TERMINAL_STATUSES.includes(b.status) && !CLIENT_CANCELLED_STATUSES.includes(b.status))
    .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime());

  const lastCompleted = rows
    .filter((b) => CLIENT_TERMINAL_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.pickup_time).getTime() - new Date(a.pickup_time).getTime())[0];

  return (
    <>
      <SjSectionHead
        title={`Bonjour${profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}`}
        action={
          <Link href="/reserver" className="sj-btn sj-btn-primary">
            + Réserver un trajet
          </Link>
        }
      />
      {error ? (
        <p role="alert" className="mb-4 text-sm text-[var(--color-error)]">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Réessayer
          </button>
        </p>
      ) : null}
      {loading ? <BrandedLoader /> : null}
      <div className="sj-hero">
        <section className="sj-hero-card">
          <div className="sj-hero-art" />
          <div className="sj-hero-copy">
            <div className="sj-eyebrow">SentraJet Premium</div>
            <h1>Réservez votre trajet en toute sérénité.</h1>
            <p>Transfert AIBD, trajet interurbain ou mise à disposition avec chauffeur professionnel.</p>
            <Link href="/reserver" className="sj-btn sj-btn-primary">
              Nouvelle réservation
            </Link>
          </div>
        </section>
        <section className="sj-hero-stats">
          <div className="sj-stat">
            <div className="sj-muted">Réservations à venir</div>
            <div className="num">{upcoming.length.toString().padStart(2, "0")}</div>
          </div>
          <div className="sj-stat">
            <div className="sj-muted">Dernière course</div>
            <div className="num" style={{ fontSize: 20 }}>
              {lastCompleted?.estimated_price != null ? formatFcfa(Number(lastCompleted.estimated_price)) : "—"}
            </div>
          </div>
        </section>
      </div>

      <SjSectionHead
        title="Mes prochaines réservations"
        action={
          <Link href="/compte/reservations" className="sj-btn sj-btn-ghost">
            Voir tout →
          </Link>
        }
      />
      {!loading ? <div className="sj-list">
        {upcoming.slice(0, 5).map((b) => (
          <Link key={b.id} href={`/compte/reservations/${b.id}`}>
            <SjCard>
              <div className="sj-between">
                <div>
                  <b>
                    {b.pickup} → {b.dropoff}
                  </b>
                  <div className="sj-muted">
                    {new Date(b.pickup_time).toLocaleString("fr-FR")} · {b.passengers} passagers
                  </div>
                  <div className="sj-gold" style={{ marginTop: 6 }}>
                    {b.estimated_price != null ? formatFcfa(Number(b.estimated_price)) : "Sur devis"}
                  </div>
                </div>
                <SjBadge tone={bookingStatusTone(b.status)}>
                  {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                </SjBadge>
              </div>
            </SjCard>
          </Link>
        ))}
        {!upcoming.length ? <SjCard><p className="sj-muted">Aucune réservation à venir. Lancez votre première demande.</p></SjCard> : null}
      </div> : null}
    </>
  );
}
