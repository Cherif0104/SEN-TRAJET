"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listVehicles, type PlatformVehicle } from "@/lib/platformOps";

export default function AdminVehiculesPage() {
  const [rows, setRows] = useState<PlatformVehicle[]>([]);

  useEffect(() => {
    void listVehicles().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Assets" title="Flotte" />
      <div className="sj-grid sj-grid-3">
        {rows.map((v) => (
          <SjCard key={v.id}>
            <div className="sj-between">
              <h3>
                {v.brand} {v.model}
              </h3>
              <SjBadge tone={bookingStatusTone(v.status)}>{v.status}</SjBadge>
            </div>
            <div className="sj-muted">
              {v.seats ?? "?"} places · {v.category}
            </div>
            <div className="sj-section-head" style={{ margin: "18px 0 0" }}>
              <span className="sj-muted">Immatriculation</span>
              <b>{v.plate_number}</b>
            </div>
          </SjCard>
        ))}
      </div>
      {!rows.length ? <SjCard><p className="sj-muted">Aucun véhicule.</p></SjCard> : null}
    </>
  );
}
