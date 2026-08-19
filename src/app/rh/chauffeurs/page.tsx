"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listDrivers, type PlatformDriver } from "@/lib/platformOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function RhChauffeursPage() {
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listDrivers()
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => [d.full_name, d.phone, d.license_number].some((f) => f?.toLowerCase().includes(q)));
  }, [drivers, query]);

  return (
    <>
      <SjSectionHead
        title="Chauffeurs"
        action={
          <Link href="/admin/chauffeurs" className="sj-btn sj-btn-primary">
            + Ajouter un chauffeur
          </Link>
        }
      />
      <div className="sj-field" style={{ marginBottom: 16 }}>
        <input placeholder="Rechercher (nom, téléphone, n° permis)…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <div className="sj-list">
          {filtered.map((d) => (
            <Link key={d.id} href={`/admin/chauffeurs/${d.id}`}>
              <SjCard>
                <div className="sj-between">
                  <div>
                    <b>{d.full_name}</b>
                    <div className="sj-muted">{d.phone || "—"} · Permis {d.license_number || "non renseigné"}</div>
                    {d.license_expiry_date ? (
                      <div className="sj-muted">Permis valide jusqu’au {new Date(d.license_expiry_date).toLocaleDateString("fr-FR")}</div>
                    ) : null}
                  </div>
                  <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
                </div>
              </SjCard>
            </Link>
          ))}
          {!filtered.length ? <SjCard><p className="sj-muted">Aucun chauffeur trouvé.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
