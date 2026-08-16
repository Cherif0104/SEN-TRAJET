"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listDrivers, type PlatformDriver } from "@/lib/platformOps";

export default function AdminChauffeursPage() {
  const [rows, setRows] = useState<PlatformDriver[]>([]);

  useEffect(() => {
    void listDrivers().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Ressources" title="Chauffeurs" />
      <div className="sj-grid sj-grid-4">
        {rows.map((d) => (
          <SjCard key={d.id}>
            <div className="sj-between">
              <div className="sj-avatar">{d.full_name[0]}</div>
              <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
            </div>
            <h3 style={{ marginTop: 14 }}>{d.full_name}</h3>
            <div className="sj-muted">{d.phone || "—"}</div>
            <div className="sj-metric-sub">Chauffeur flotte SentraJet</div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun chauffeur.</p></SjCard> : null}
    </>
  );
}
