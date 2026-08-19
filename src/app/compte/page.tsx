"use client";

import Link from "next/link";
import { Plane, Route, Clock, CalendarCheck, Heart } from "lucide-react";
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

const SERVICE_TILES = [
  {
    href: "/reserver?service=transfert_aibd",
    icon: Plane,
    title: "Transfert Aéroport",
    subtitle: "AIBD, arrivée ou départ",
    background: "linear-gradient(135deg, #07111f, #1c3350)",
  },
  {
    href: "/reserver?service=interurbain",
    icon: Route,
    title: "Trajet interurbain",
    subtitle: "Entre régions, avec chauffeur",
    background: "linear-gradient(135deg, #1c3350, #35507a)",
  },
  {
    href: "/reserver?service=mise_a_disposition",
    icon: Clock,
    title: "Mise à disposition",
    subtitle: "Chauffeur à l’heure ou à la journée",
    background: "linear-gradient(135deg, #3a2a12, #8a6a1f)",
  },
  {
    href: "/compte/reservations",
    icon: CalendarCheck,
    title: "Mes réservations",
    subtitle: "Suivre mes courses",
    background: "linear-gradient(135deg, #2a2a2a, #4a4a4a)",
  },
  {
    href: "/compte/favoris",
    icon: Heart,
    title: "Mes favoris",
    subtitle: "Adresses enregistrées",
    background: "linear-gradient(135deg, #3a1a2a, #6a2f4a)",
  },
] as const;

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

      <p className="sj-muted" style={{ marginBottom: 10 }}>Que voulez-vous faire aujourd’hui ?</p>
      <div className="sj-service-grid">
        {SERVICE_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href} className="sj-service-tile" style={{ background: tile.background }}>
              <Icon className="sj-service-icon" style={{ width: 34, height: 34 }} />
              <b>{tile.title}</b>
              <span>{tile.subtitle}</span>
            </Link>
          );
        })}
      </div>

      <div className="sj-toolbar" style={{ marginTop: 16, marginBottom: 4 }}>
        <div className="sj-muted">Réservations à venir : <strong style={{ color: "var(--color-text-primary)" }}>{upcoming.length}</strong></div>
        <div className="sj-muted">
          Dernière course : <strong style={{ color: "var(--color-text-primary)" }}>{lastCompleted?.estimated_price != null ? formatFcfa(Number(lastCompleted.estimated_price)) : "—"}</strong>
        </div>
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

      <p className="sj-muted" style={{ marginTop: 24, fontSize: 12, textAlign: "center" }}>
        Besoin d&apos;un trajet interurbain économique et partagé ?{" "}
        <a href="/allo-dakar" target="_blank" rel="noreferrer" style={{ color: "var(--sj-muted)", textDecoration: "underline" }}>
          Découvrir SentraJet Allo Dakar
        </a>{" "}
        — offre indépendante, hors flotte Premium.
      </p>
    </>
  );
}
