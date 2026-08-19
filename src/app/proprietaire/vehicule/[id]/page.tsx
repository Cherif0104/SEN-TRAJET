"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Car } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { getMyOwnerRecord, listMyVehicleContracts, listOwnerVehicleMissions, type OwnerVehicleContract, type OwnerVehicleMission } from "@/lib/ownerOps";
import { loadEntity360, type Entity360Data } from "@/lib/entity360";
import { bookingStatusTone } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ProprietaireVehiculeDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [contract, setContract] = useState<OwnerVehicleContract | null>(null);
  const [missions, setMissions] = useState<OwnerVehicleMission[]>([]);
  const [entity, setEntity] = useState<Entity360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [notMine, setNotMine] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        if (!owner) {
          setNotMine(true);
          return;
        }
        const contracts = await listMyVehicleContracts(owner.id).catch(() => []);
        const mine = contracts.find((c) => c.vehicle_id === params.id);
        if (!mine) {
          setNotMine(true);
          return;
        }
        setContract(mine);
        const [missionRows, entityData] = await Promise.all([
          listOwnerVehicleMissions(params.id).catch(() => []),
          loadEntity360("vehicle", params.id).catch(() => null),
        ]);
        setMissions(missionRows);
        setEntity(entityData);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, params.id]);

  if (loading) return <BrandedLoader />;

  if (notMine || !contract) {
    return (
      <SjCard>
        <p className="sj-muted">Ce véhicule n’est pas rattaché à votre dossier propriétaire.</p>
      </SjCard>
    );
  }

  const thisMonth = new Date();
  const missionsThisMonth = missions.filter((m) => {
    const d = new Date(m.pickup_time);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const kmThisMonth = missionsThisMonth.reduce((sum, m) => sum + Number(m.distance_km || 0), 0);

  return (
    <>
      <SjSectionHead
        eyebrow="Fiche véhicule"
        title={contract.vehicle ? `${contract.vehicle.brand} ${contract.vehicle.model}` : contract.vehicle_label}
        action={<SjBadge tone={bookingStatusTone(contract.vehicle?.status || contract.status)}>{contract.vehicle?.status || contract.status}</SjBadge>}
      />

      {contract.vehicle?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contract.vehicle.photo_url}
          alt=""
          style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 16, marginBottom: 16 }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 140,
            borderRadius: 16,
            marginBottom: 16,
            background: "var(--color-surface-secondary)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Car className="h-10 w-10 text-[var(--color-text-secondary)]" />
        </div>
      )}

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <div className="sj-row"><span>Immatriculation</span><b>{contract.vehicle?.plate_number || "—"}</b></div>
          <div className="sj-row"><span>Catégorie</span><b>{contract.vehicle?.category || "—"}</b></div>
          <div className="sj-row"><span>Places</span><b>{contract.vehicle?.seats ?? "—"}</b></div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Missions ce mois</div>
          <div className="sj-metric">{missionsThisMonth.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">{kmThisMonth > 0 ? `${Math.round(kmThisMonth)} km parcourus` : "Aucun kilométrage enregistré"}</div>
        </SjCard>
      </div>

      <SjSectionHead title="Contrat rattaché" />
      <SjCard>
        <div className="sj-row"><span>Montant mensuel</span><b className="sj-gold">{formatFcfa(contract.monthly_amount_fcfa)}</b></div>
        <div className="sj-row"><span>Début</span><b>{contract.start_date ? new Date(contract.start_date).toLocaleDateString("fr-FR") : "—"}</b></div>
        <div className="sj-row"><span>Fin</span><b>{contract.end_date ? new Date(contract.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}</b></div>
      </SjCard>

      <SjSectionHead title="Entretien" />
      <div className="sj-list">
        {(entity?.maintenance ?? []).map((m) => (
          <SjCard key={m.id}>
            <div className="sj-between">
              <div>
                <b>{m.title}</b>
                <div className="sj-muted">{m.maintenance_type} · {m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString("fr-FR") : "Date à définir"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={m.status === "completed" ? "success" : m.status === "scheduled" ? "info" : "warning"}>{m.status}</SjBadge>
                {m.cost_fcfa != null ? <div className="sj-muted" style={{ marginTop: 6 }}>{formatFcfa(m.cost_fcfa)}</div> : null}
              </div>
            </div>
          </SjCard>
        ))}
        {!entity?.maintenance?.length ? <SjCard><p className="sj-muted">Aucun entretien enregistré pour ce véhicule.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Utilisation récente" />
      <div className="sj-list">
        {missions.slice(0, 6).map((m) => (
          <SjCard key={m.booking_id}>
            <div className="sj-between">
              <div>
                <b>{m.pickup} → {m.dropoff}</b>
                <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")}{m.distance_km ? ` · ${m.distance_km} km` : ""}</div>
              </div>
              <SjBadge tone={bookingStatusTone(m.status)}>{m.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!missions.length ? <SjCard><p className="sj-muted">Aucune mission enregistrée pour ce véhicule.</p></SjCard> : null}
      </div>
    </>
  );
}
