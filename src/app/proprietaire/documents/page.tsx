"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { getMyOwnerRecord, listMyVehicleContracts } from "@/lib/ownerOps";
import { loadEntity360, signedEntityDocumentUrl, type EntityDocument } from "@/lib/entity360";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

type Row = EntityDocument & { vehicleLabel: string };

function expiryTone(expiresAt: string | null): "success" | "warning" | "info" | "danger" {
  if (!expiresAt) return "info";
  const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
}

export default function ProprietaireDocumentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        if (!owner) return;
        const contracts = await listMyVehicleContracts(owner.id).catch(() => []);
        const ownerData = await loadEntity360("asset_partner", owner.id).catch(() => null);
        const vehicleResults = await Promise.all(
          contracts
            .filter((c) => c.vehicle_id)
            .map(async (c) => ({
              label: c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : c.vehicle_label,
              data: await loadEntity360("vehicle", c.vehicle_id as string).catch(() => null),
            }))
        );
        const all: Row[] = [];
        if (ownerData) for (const d of ownerData.documents) all.push({ ...d, vehicleLabel: "Dossier partenaire" });
        for (const v of vehicleResults) {
          if (!v.data) continue;
          for (const d of v.data.documents) all.push({ ...d, vehicleLabel: v.label });
        }
        setRows(all);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function download(row: Row) {
    setDownloading(row.id);
    setError(null);
    try {
      const url = await signedEntityDocumentUrl(row.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’ouvrir ce document.");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead title="Documents" />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      <div className="sj-list">
        {rows.map((r) => (
          <SjCard key={r.id}>
            <div className="sj-between">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                <div>
                  <b>{r.name}</b>
                  <div className="sj-muted">
                    {r.vehicleLabel} · {r.document_type}
                    {r.expires_at ? ` · expire le ${new Date(r.expires_at).toLocaleDateString("fr-FR")}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {r.expires_at ? <SjBadge tone={expiryTone(r.expires_at)}>{expiryTone(r.expires_at) === "danger" ? "Expiré" : expiryTone(r.expires_at) === "warning" ? "Bientôt" : "Valide"}</SjBadge> : null}
                <button type="button" className="sj-btn" onClick={() => void download(r)} disabled={downloading === r.id}>
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </SjCard>
        ))}
        {!rows.length ? (
          <SjCard><p className="sj-muted">Aucun document disponible pour le moment.</p></SjCard>
        ) : null}
      </div>
    </>
  );
}
