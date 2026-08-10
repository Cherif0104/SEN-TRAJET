"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listDrivers,
  listPlatformBookings,
  listPartnerContracts,
  type PlatformBooking,
  type PlatformDriver,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function AdminPage() {
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [partners, setPartners] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listPlatformBookings(), listDrivers(), listPartnerContracts()])
      .then(([b, d, p]) => {
        setBookings(b);
        setDrivers(d);
        setPartners(p.filter((x) => x.status === "active").length);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"));
  }, []);

  const toAssign = bookings.filter((b) => b.status === "a_assigner" || !b.service_order?.dispatch);
  const availableDrivers = drivers.filter((d) => d.status === "active" || d.status === "available" || d.status === "Disponible");
  const ca = bookings.reduce((sum, b) => sum + Number(b.estimated_price ?? 0), 0);

  return (
    <>
      <div className="sj-hero">
        <section className="sj-hero-card">
          <div className="sj-hero-art" />
          <div className="sj-hero-copy">
            <div className="sj-eyebrow">Mobility control center</div>
            <h1>Votre flotte, vos réservations, votre service.</h1>
            <p>
              Cockpit SentraJet Premium pour piloter clients, chauffeurs, partenaires, tarifs et
              dispatch.
            </p>
            <Link href="/admin/reservations" className="sj-btn sj-btn-primary">
              Voir les réservations
            </Link>
          </div>
        </section>
        <section className="sj-hero-stats">
          <div className="sj-stat">
            <div className="sj-muted">Réservations</div>
            <div className="num">{bookings.length.toString().padStart(2, "0")}</div>
            <div className="sj-gold">Pipeline actif</div>
          </div>
          <div className="sj-stat">
            <div className="sj-muted">Chauffeurs dispos</div>
            <div className="num">{availableDrivers.length.toString().padStart(2, "0")}</div>
            <div className="sj-gold">Sur {drivers.length} actifs</div>
          </div>
          <div className="sj-stat">
            <div className="sj-muted">CA estimé</div>
            <div className="num">{Math.round(ca / 1000)}k</div>
            <div className="sj-gold">FCFA</div>
          </div>
          <div className="sj-stat">
            <div className="sj-muted">Partenaires actifs</div>
            <div className="num">{partners.toString().padStart(2, "0")}</div>
            <div className="sj-gold">B2B</div>
          </div>
        </section>
      </div>

      {error ? <p className="sj-muted">{error}</p> : null}

      <div className="sj-grid sj-grid-4">
        {[
          ["Réservations à traiter", String(toAssign.length), "À assigner"],
          ["Courses confirmées", String(bookings.filter((b) => b.status === "confirmee").length), "Dispatch OK"],
          ["Chauffeurs disponibles", String(availableDrivers.length), "Prêts à partir"],
          ["Demandes partenaires", String(bookings.filter((b) => b.pricing_segment === "partner").length), "B2B"],
        ].map(([label, value, sub]) => (
          <SjCard key={label}>
            <div className="sj-muted">{label}</div>
            <div className="sj-metric">{value}</div>
            <div className="sj-metric-sub">{sub}</div>
          </SjCard>
        ))}
      </div>

      <SjSectionHead
        eyebrow="Operations"
        title="Opérations du jour"
        action={
          <Link href="/admin/dispatch" className="sj-btn sj-btn-ghost">
            Ouvrir le dispatch →
          </Link>
        }
      />

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Prochaines prises en charge</h3>
          <div className="sj-list">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="sj-row">
                <div>
                  <b>
                    {b.pickup} → {b.dropoff}
                  </b>
                  <div className="sj-muted">
                    {b.client?.full_name || b.client?.company_name || "Client"} ·{" "}
                    {new Date(b.pickup_time).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <SjBadge tone={bookingStatusTone(b.status)}>
                  {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                </SjBadge>
              </div>
            ))}
            {!bookings.length ? <div className="sj-muted">Aucune réservation pour le moment.</div> : null}
          </div>
        </SjCard>
        <SjCard>
          <h3>Disponibilité chauffeurs</h3>
          <div className="sj-list">
            {drivers.slice(0, 5).map((d) => (
              <div key={d.id} className="sj-row">
                <div className="sj-between" style={{ width: "100%" }}>
                  <div>
                    <b>{d.full_name}</b>
                    <div className="sj-muted">{d.phone || "—"}</div>
                  </div>
                  <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
                </div>
              </div>
            ))}
          </div>
        </SjCard>
      </div>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-muted">Volume estimé suivi</div>
        <div className="sj-metric">{formatFcfa(ca)}</div>
      </SjCard>
    </>
  );
}
