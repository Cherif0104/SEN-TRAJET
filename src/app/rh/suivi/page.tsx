"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listDrivers, type PlatformDriver } from "@/lib/platformOps";
import { listDriverDocuments, type RhDriverDocument } from "@/lib/rhOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function RhSuiviPage() {
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [documents, setDocuments] = useState<RhDriverDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listDrivers().catch(() => []), listDriverDocuments().catch(() => [])])
      .then(([d, docs]) => {
        setDrivers(d);
        setDocuments(docs);
      })
      .finally(() => setLoading(false));
  }, []);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of drivers) map.set(d.status, (map.get(d.status) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [drivers]);

  const pendingByDriver = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const doc of documents) {
      if (doc.status !== "pending") continue;
      const existing = map.get(doc.driver_id);
      map.set(doc.driver_id, { name: doc.driver?.full_name || "Chauffeur", count: (existing?.count ?? 0) + 1 });
    }
    return [...map.entries()];
  }, [documents]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="RH" title="Suivi" />

      <SjSectionHead title="Répartition des chauffeurs par statut" />
      <div className="sj-list">
        {byStatus.map(([status, count]) => (
          <SjCard key={status}>
            <div className="sj-between">
              <b>{status}</b>
              <span className="sj-gold">{count}</span>
            </div>
          </SjCard>
        ))}
        {!byStatus.length ? <SjCard><p className="sj-muted">Aucun chauffeur enregistré.</p></SjCard> : null}
      </div>

      <SjSectionHead
        title="Dossiers avec documents en attente"
        action={<Link href="/rh/documents" className="sj-btn sj-btn-ghost">Traiter →</Link>}
      />
      <div className="sj-list">
        {pendingByDriver.map(([driverId, info]) => (
          <Link key={driverId} href={`/admin/chauffeurs/${driverId}`}>
            <SjCard>
              <div className="sj-between">
                <b>{info.name}</b>
                <span className="sj-muted">{info.count} document{info.count !== 1 ? "s" : ""} en attente</span>
              </div>
            </SjCard>
          </Link>
        ))}
        {!pendingByDriver.length ? <SjCard><p className="sj-muted">Aucun document en attente de vérification.</p></SjCard> : null}
      </div>
    </>
  );
}
