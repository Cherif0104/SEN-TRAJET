"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listDrivers, type PlatformDriver } from "@/lib/platformOps";
import { listDriverDocuments, type RhDriverDocument } from "@/lib/rhOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function isIncomplete(d: PlatformDriver): boolean {
  return !d.license_number || !d.license_photo_url || !d.phone;
}

export default function RhHomePage() {
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

  const actifs = drivers.filter((d) => ["available", "active", "on_trip", "Disponible"].includes(d.status));
  const indisponibles = drivers.filter((d) => ["offline", "Hors ligne", "suspended"].includes(d.status));
  const incomplets = useMemo(() => drivers.filter(isIncomplete), [drivers]);
  const now = Date.now();
  const expirants = useMemo(
    () =>
      drivers.filter((d) => {
        if (!d.license_expiry_date) return false;
        const days = (new Date(d.license_expiry_date).getTime() - now) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
      }),
    [drivers, now]
  );
  const pendingDocs = documents.filter((d) => d.status === "pending");

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="RH" title="Accueil" />

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Chauffeurs actifs</div>
          <div className="sj-metric">{actifs.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Chauffeurs indisponibles</div>
          <div className="sj-metric">{indisponibles.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Permis à renouveler (≤30j)</div>
          <div className="sj-metric">{expirants.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Dossiers incomplets</div>
          <div className="sj-metric">{incomplets.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      {pendingDocs.length ? (
        <>
          <SjSectionHead
            title="Alertes"
            action={<Link href="/rh/documents" className="sj-btn sj-btn-ghost">Vérifier →</Link>}
          />
          <SjCard>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
              <span>{pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} en attente de vérification</span>
            </div>
          </SjCard>
        </>
      ) : null}

      {expirants.length ? (
        <>
          <SjSectionHead title="Permis à renouveler" />
          <div className="sj-list">
            {expirants.map((d) => (
              <SjCard key={d.id}>
                <div className="sj-between">
                  <b>{d.full_name}</b>
                  <span className="sj-muted">Expire le {new Date(d.license_expiry_date!).toLocaleDateString("fr-FR")}</span>
                </div>
              </SjCard>
            ))}
          </div>
        </>
      ) : null}

      <SjSectionHead
        title="Dossiers incomplets"
        action={<Link href="/rh/chauffeurs" className="sj-btn sj-btn-ghost">Voir tout →</Link>}
      />
      <div className="sj-list">
        {incomplets.slice(0, 6).map((d) => (
          <SjCard key={d.id}>
            <div className="sj-between">
              <b>{d.full_name}</b>
              <span className="sj-muted">
                {!d.phone ? "Téléphone manquant" : !d.license_number ? "N° permis manquant" : "Photo permis manquante"}
              </span>
            </div>
          </SjCard>
        ))}
        {!incomplets.length ? <SjCard><p className="sj-muted">Tous les dossiers sont complets.</p></SjCard> : null}
      </div>
    </>
  );
}
