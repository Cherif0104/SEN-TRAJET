"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listDrivers, listVehicles, type PlatformDriver, type PlatformVehicle } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ManagerFlottePage() {
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listVehicles().catch(() => []), listDrivers().catch(() => [])])
      .then(([v, d]) => {
        setVehicles(v);
        setDrivers(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  const available = vehicles.filter((v) => ["available", "Disponible"].includes(v.status));
  const inService = vehicles.filter((v) => ["in_service", "on_trip"].includes(v.status));
  const maintenance = vehicles.filter((v) => v.status === "maintenance");
  const availableDrivers = drivers.filter((d) => ["available", "active", "Disponible"].includes(d.status));

  return (
    <>
      <SjSectionHead
        eyebrow="Manager"
        title="Flotte — supervision"
        action={<Link href="/fleet" className="sj-btn">Gestion complète (Fleet) →</Link>}
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Vue de lecture. La gestion opérationnelle (affectation, entretien) reste dans l’espace Fleet Manager.
      </p>

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Disponibles</div>
          <div className="sj-metric">{available.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En mission</div>
          <div className="sj-metric">{inService.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En maintenance</div>
          <div className="sj-metric">{maintenance.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Chauffeurs disponibles</div>
          <div className="sj-metric">{availableDrivers.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Véhicules" />
      <div className="sj-list">
        {vehicles.map((v) => (
          <SjCard key={v.id}>
            <div className="sj-between">
              <div>
                <b>{v.brand} {v.model}</b>
                <div className="sj-muted">{v.plate_number}</div>
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
