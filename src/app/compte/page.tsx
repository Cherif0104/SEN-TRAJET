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

export default function ComptePage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      try {
        const clientId = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: profile?.phone,
          email: user.email,
        });
        const all = await listPlatformBookings();
        setRows(all.filter((b) => b.client_id === clientId));
      } catch {
        setRows([]);
      }
    })();
  }, [user, profile]);

  const upcoming = rows.filter((b) => !["terminee", "annulee"].includes(b.status));
  const lastPrice = rows[0]?.estimated_price;

  return (
    <>
      <SjSectionHead
        title={`Bonjour${profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}`}
        action={
          <Link href="/compte/reserver" className="sj-btn sj-btn-primary">
            + Réserver un trajet
          </Link>
        }
      />
      <div className="sj-hero">
        <section className="sj-hero-card">
          <div className="sj-hero-art" />
          <div className="sj-hero-copy">
            <div className="sj-eyebrow">SentraJet Premium</div>
            <h1>Réservez votre trajet en toute sérénité.</h1>
            <p>Transfert AIBD, trajet interurbain ou mise à disposition avec chauffeur professionnel.</p>
            <Link href="/compte/reserver" className="sj-btn sj-btn-primary">
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
            <div className="sj-muted">Dernier trajet</div>
            <div className="num">{lastPrice != null ? Math.round(Number(lastPrice) / 1000) + "k" : "—"}</div>
            <div className="sj-gold">FCFA</div>
          </div>
        </section>
      </div>

      <SjSectionHead title="Mes prochaines réservations" />
      <div className="sj-list">
        {upcoming.slice(0, 5).map((b) => (
          <SjCard key={b.id}>
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
        ))}
        {!upcoming.length ? <SjCard><p className="sj-muted">Aucune réservation à venir. Lancez votre première demande.</p></SjCard> : null}
      </div>
    </>
  );
}
