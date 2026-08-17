"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Car } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listVehicles, type PlatformVehicle } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function FleetVehiculesPage() {
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => [v.brand, v.model, v.plate_number].some((f) => f?.toLowerCase().includes(q)));
  }, [vehicles, query]);

  return (
    <>
      <SjSectionHead
        title="Véhicules"
        action={
          <Link href="/admin/vehicules" className="sj-btn sj-btn-primary">
            + Ajouter un véhicule
          </Link>
        }
      />
      <div className="sj-field" style={{ marginBottom: 16 }}>
        <input placeholder="Rechercher (marque, modèle, plaque)…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((v) => (
            <Link key={v.id} href={`/admin/vehicules/${v.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {v.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.photo_url} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 56, height: 40, borderRadius: 8, background: "var(--color-surface-secondary)", display: "grid", placeItems: "center" }}>
                        <Car className="h-5 w-5 text-[var(--color-text-secondary)]" />
                      </div>
                    )}
                    <div>
                      <b>{v.brand} {v.model}</b>
                      <div className="sj-muted">{v.plate_number} · {v.seats ?? "?"} places · {v.category}</div>
                    </div>
                  </div>
                  <SjBadge tone={bookingStatusTone(v.status)}>{v.status}</SjBadge>
                </div>
              </SjCard>
            </Link>
          ))}
          {!filtered.length ? <SjCard><p className="sj-muted">Aucun véhicule trouvé.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
