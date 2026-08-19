"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function ChauffeurMissionsPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void listMissionsForDriverUser(user.id)
      .then((rows) => setMissions(rows.filter((m) => !TERMINAL.includes(m.status))))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <SjSectionHead eyebrow="Missions" title="Courses assignées" />
      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {missions.map((m) => (
            <Link key={m.id} href={`/chauffeur/missions/${m.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div>
                    <b>{m.reference || m.id.slice(0, 8)}</b>
                    <div className="sj-muted">
                      {m.pickup} → {m.dropoff}
                    </div>
                    <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")}</div>
                    <div style={{ marginTop: 8 }}>
                      Véhicule :{" "}
                      {m.service_order?.dispatch?.vehicle
                        ? `${m.service_order.dispatch.vehicle.brand} ${m.service_order.dispatch.vehicle.model}`
                        : "—"}
                    </div>
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
            </Link>
          ))}
          {!missions.length ? <SjCard><p className="sj-muted">Pas encore de mission assignée.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
