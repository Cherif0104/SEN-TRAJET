"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listDrivers, listVehicles, type PlatformDriver, type PlatformVehicle } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function OpsFlottePage() {
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listDrivers().catch(() => []), listVehicles().catch(() => [])])
      .then(([d, v]) => {
        setDrivers(d);
        setVehicles(v);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  const availableDrivers = drivers.filter((d) => ["available", "active", "Disponible"].includes(d.status));
  const availableVehicles = vehicles.filter((v) => ["available", "Disponible"].includes(v.status));
  const maintenanceVehicles = vehicles.filter((v) => v.status === "maintenance");

  return (
    <>
      <SjSectionHead eyebrow="Opérations" title="Flotte" />
      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Chauffeurs disponibles</div>
          <div className="sj-metric">{availableDrivers.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Chauffeurs au total</div>
          <div className="sj-metric">{drivers.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Véhicules disponibles</div>
          <div className="sj-metric">{availableVehicles.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En maintenance</div>
          <div className="sj-metric">{maintenanceVehicles.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Chauffeurs" />
      <div className="sj-list">
        {drivers.map((d) => (
          <SjCard key={d.id}>
            <div className="sj-between">
              <div>
                <b>{d.full_name}</b>
                <div className="sj-muted">{d.phone || "—"}</div>
              </div>
              <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!drivers.length ? <SjCard><p className="sj-muted">Aucun chauffeur enregistré.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Véhicules" />
      <div className="sj-list">
        {vehicles.map((v) => (
          <SjCard key={v.id}>
            <div className="sj-between">
              <div>
                <b>{v.brand} {v.model}</b>
                <div className="sj-muted">{v.plate_number} · {v.seats ?? "?"} places</div>
              </div>
              <SjBadge tone={bookingStatusTone(v.status)}>{v.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!vehicles.length ? <SjCard><p className="sj-muted">Aucun véhicule enregistré.</p></SjCard> : null}
      </div>
    </>
  );
}
