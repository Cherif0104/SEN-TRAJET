"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listVehicles, type PlatformVehicle } from "@/lib/platformOps";
import { listExpiringVehicleDocuments, type ExpiringVehicleDocument } from "@/lib/fleetOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function FleetHomePage() {
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [expiring, setExpiring] = useState<ExpiringVehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listVehicles().catch(() => []), listExpiringVehicleDocuments(30).catch(() => [])])
      .then(([v, e]) => {
        setVehicles(v);
        setExpiring(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const available = vehicles.filter((v) => ["available", "Disponible"].includes(v.status));
  const inService = vehicles.filter((v) => ["in_service", "on_trip"].includes(v.status));
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance");
  const availabilityRate = useMemo(
    () => (vehicles.length ? Math.round((available.length / vehicles.length) * 100) : 0),
    [vehicles.length, available.length]
  );

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Fleet Manager" title="Accueil" />

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Véhicules disponibles</div>
          <div className="sj-metric">{available.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En mission</div>
          <div className="sj-metric">{inService.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">En maintenance</div>
          <div className="sj-metric">{inMaintenance.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Documents à renouveler</div>
          <div className="sj-metric">{expiring.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-muted">Disponibilité globale de la flotte</div>
        <div className="sj-metric sj-gold">{availabilityRate}%</div>
        <div className="sj-metric-sub">{available.length} disponibles sur {vehicles.length} véhicules</div>
      </SjCard>

      {expiring.length ? (
        <>
          <SjSectionHead
            title="Documents à renouveler"
            action={<Link href="/fleet/vehicules" className="sj-btn sj-btn-ghost">Voir la flotte →</Link>}
          />
          <div className="sj-list">
            {expiring.slice(0, 6).map((d) => (
              <SjCard key={d.id}>
                <div className="sj-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                    <div>
                      <b>{d.name}</b>
                      <div className="sj-muted">{d.vehicle_label}</div>
                    </div>
                  </div>
                  <span className="sj-muted">Expire le {new Date(d.expires_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </SjCard>
            ))}
          </div>
        </>
      ) : null}

      <SjSectionHead
        title="Véhicules en maintenance"
        action={<Link href="/fleet/maintenance" className="sj-btn sj-btn-ghost">Voir tout →</Link>}
      />
      <div className="sj-list">
        {inMaintenance.map((v) => (
          <SjCard key={v.id}>
            <b>{v.brand} {v.model}</b>
            <div className="sj-muted">{v.plate_number}</div>
          </SjCard>
        ))}
        {!inMaintenance.length ? <SjCard><p className="sj-muted">Aucun véhicule en maintenance actuellement.</p></SjCard> : null}
      </div>
    </>
  );
}
