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

export default function PartenaireHomePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [partnerName, setPartnerName] = useState("Partenaire");

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const contracts = await listPartnerContracts().catch(() => []);
      const mine = contracts.find((c) => c.partner_user_id === user.id) || contracts[0];
      if (mine) setPartnerName(mine.partner_name);
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
        eyebrow="Partenaire B2B"
        title="Votre espace partenaire"
        action={
          <Link href="/partenaire/reserver" className="sj-btn sj-btn-primary">
            + Nouvelle demande
          </Link>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8 }}>
        {partnerName} — tarification B2B SentraJet Premium
      </p>
      <div className="sj-grid sj-grid-4" style={{ marginTop: 18 }}>
        {[
          ["Tarif AIBD", "20 000 F", "1–2 passagers"],
          ["Tarif interurbain", "700 F/km", "Net partenaire"],
          ["Demandes ouvertes", String(rows.filter((r) => r.status === "a_assigner").length).padStart(2, "0"), "À confirmer"],
          ["Marge libre", "Votre prix", "Refacturation client"],
        ].map(([a, b, c]) => (
          <SjCard key={a}>
            <div className="sj-muted">{a}</div>
            <div className="sj-metric">{b}</div>
            <div className="sj-metric-sub">{c}</div>
          </SjCard>
        ))}
      </div>
      <SjSectionHead title="Demandes récentes" />
      <div className="sj-list">
        {rows.slice(0, 6).map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>
                  {b.pickup} → {b.dropoff}
                </b>
                <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
              </div>
              <SjBadge tone={bookingStatusTone(b.status)}>
                {BOOKING_STATUS_LABEL[b.status] ?? b.status}
              </SjBadge>
            </div>
          </SjCard>
        ))}
        {!rows.length ? <SjCard><p className="sj-muted">Aucune demande récente.</p></SjCard> : null}
      </div>
    </>
  );
}
