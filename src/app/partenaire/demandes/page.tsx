"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPartnerContracts,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function PartenaireDemandesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const contracts = await listPartnerContracts().catch(() => []);
      const mine = contracts.find((c) => c.partner_user_id === user.id);
      const all = await listPlatformBookings().catch(() => []);
      setRows(
        mine
          ? all.filter((b) => b.partner_contract_id === mine.id || b.pricing_segment === "partner")
          : all.filter((b) => b.pricing_segment === "partner")
      );
    })();
  }, [user]);

  return (
    <>
      <SjSectionHead
        title="Demandes"
        action={
          <Link href="/partenaire/reserver" className="sj-btn sj-btn-primary">
            + Nouvelle demande
          </Link>
        }
      />
      <div className="sj-list">
        {rows.map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.reference || b.id.slice(0, 8)}</b>
                <div className="sj-muted">
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
        {!rows.length ? <SjCard><p className="sj-muted">Aucune demande.</p></SjCard> : null}
      </div>
    </>
  );
}
