"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Tab = "a_venir" | "en_cours" | "passees";

const TERMINAL = ["terminee", "annulee_client", "annulee_sentrajet", "remboursee", "no_show"];
const ONGOING = ["chauffeur_assigne", "chauffeur_en_route", "chauffeur_arrive", "client_pris_en_charge", "en_cours"];

export default function PartenaireDemandesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("a_venir");

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        // La RLS ne renvoie déjà que les réservations liées à mon contrat ou à mon carnet clients.
        const all = await listPlatformBookings().catch(() => []);
        setRows(all);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filtered = rows.filter((b) => {
    if (tab === "en_cours") return ONGOING.includes(b.status);
    if (tab === "passees") return TERMINAL.includes(b.status);
    return !ONGOING.includes(b.status) && !TERMINAL.includes(b.status);
  });

  return (
    <>
      <SjSectionHead
        title="Réservations"
        action={
          <Link href="/partenaire/reserver" className="sj-btn sj-btn-primary">
            + Nouvelle réservation
          </Link>
        }
      />
      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {[
          ["a_venir", "À venir"],
          ["en_cours", "En cours"],
          ["passees", "Passées"],
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

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((b) => (
            <SjCard key={b.id}>
              <div className="sj-between">
                <div>
                  <b>{b.reference || b.id.slice(0, 8)}</b>
                  <div className="sj-muted">
                    {b.client?.full_name || b.client?.company_name ? `${b.client?.full_name || b.client?.company_name} · ` : ""}
                    {b.pickup} → {b.dropoff}
                  </div>
                  <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
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
          {!filtered.length ? <SjCard><p className="sj-muted">Aucune réservation dans cette catégorie.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
