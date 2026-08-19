"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { getMyOwnerRecord, listMyVehicleContracts, type OwnerVehicleContract } from "@/lib/ownerOps";
import { bookingStatusTone } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ProprietaireVehiculeListPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<OwnerVehicleContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        if (!owner) return;
        setContracts(await listMyVehicleContracts(owner.id).catch(() => []));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead title="Mes véhicules" />
      <div className="sj-list">
        {contracts.map((c) => (
          <Link key={c.id} href={c.vehicle_id ? `/proprietaire/vehicule/${c.vehicle_id}` : "#"}>
            <SjCard>
              <div className="sj-between">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {c.vehicle?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.vehicle.photo_url}
                      alt=""
                      style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 40,
                        borderRadius: 8,
                        background: "var(--color-surface-secondary)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Car className="h-5 w-5 text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                  <div>
                    <b>{c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : c.vehicle_label}</b>
                    <div className="sj-muted">{c.vehicle?.plate_number || "Plaque à confirmer"}</div>
                  </div>
                </div>
                <SjBadge tone={bookingStatusTone(c.vehicle?.status || c.status)}>
                  {c.vehicle?.status || c.status}
                </SjBadge>
              </div>
            </SjCard>
          </Link>
        ))}
        {!contracts.length ? (
          <SjCard>
            <p className="sj-muted">Aucun véhicule rattaché à votre dossier pour le moment.</p>
          </SjCard>
        ) : null}
      </div>
    </>
  );
}
