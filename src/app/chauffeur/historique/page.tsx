"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listMissionsForDriverUser,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const TERMINAL = ["terminee", "annulee_client", "annulee_sentrajet", "no_show"];

export default function ChauffeurHistoriquePage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void listMissionsForDriverUser(user.id)
      .then((rows) =>
        setMissions(
          rows
            .filter((m) => TERMINAL.includes(m.status))
            .sort((a, b) => new Date(b.pickup_time).getTime() - new Date(a.pickup_time).getTime())
        )
      )
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [user]);

  const completedThisMonth = missions.filter((m) => {
    const d = new Date(m.pickup_time);
    const now = new Date();
    return m.status === "terminee" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <SjSectionHead title="Historique des courses" />
      <SjCard style={{ marginBottom: 16 }}>
        <div className="sj-muted">Courses terminées ce mois</div>
        <div className="sj-metric">{completedThisMonth.toString().padStart(2, "0")}</div>
      </SjCard>
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {missions.map((m) => (
            <SjCard key={m.id}>
              <div className="sj-between">
                <div>
                  <b>
                    {m.pickup} → {m.dropoff}
                  </b>
                  <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")} · {m.passengers} passagers</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={bookingStatusTone(m.status)}>
                    {BOOKING_STATUS_LABEL[m.status] ?? m.status}
                  </SjBadge>
                  <div className="sj-gold" style={{ marginTop: 10 }}>
                    {m.estimated_price != null ? formatFcfa(Number(m.estimated_price)) : "—"}
                  </div>
                </div>
              </div>
            </SjCard>
          ))}
          {!missions.length ? <SjCard><p className="sj-muted">Historique vide pour le moment.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
