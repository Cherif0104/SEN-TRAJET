"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { bookingStatusTone } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { getMyOwnerRecord, listMyVehicleContracts, type OwnerVehicleContract } from "@/lib/ownerOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function ProprietaireContratPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OwnerVehicleContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const owner = await getMyOwnerRecord(user.id).catch(() => null);
        if (!owner) {
          setRows([]);
          return;
        }
        setRows(await listMyVehicleContracts(owner.id).catch(() => []));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead title="Mes contrats d’exploitation" />
      <div className="sj-list">
        {rows.map((c) => (
          <SjCard key={c.id}>
            <div className="sj-between">
              <div>
                <b>{c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : c.vehicle_label}</b>
                <div className="sj-gold">{formatFcfa(c.monthly_amount_fcfa)} / mois</div>
                <div className="sj-muted">
                  {c.start_date ? new Date(c.start_date).toLocaleDateString("fr-FR") : "Début à définir"} →{" "}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString("fr-FR") : "Durée indéterminée"}
                </div>
                {c.terms_summary ? <p style={{ marginTop: 10 }}>{c.terms_summary}</p> : null}
                {c.vehicle_id ? (
                  <Link href={`/proprietaire/vehicule/${c.vehicle_id}`} className="sj-gold" style={{ display: "inline-block", marginTop: 8 }}>
                    Voir la fiche véhicule →
                  </Link>
                ) : null}
              </div>
              <SjBadge tone={bookingStatusTone(c.status)}>{c.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!rows.length ? (
          <SjCard>
            <p className="sj-muted">
              Aucun contrat pour le moment. Contactez SentraJet pour ouvrir un dossier Vehicle Partner.
            </p>
            <a className="sj-btn sj-btn-primary" href="https://wa.me/221788324069" target="_blank" rel="noreferrer">
              WhatsApp propriétaires
            </a>
          </SjCard>
        ) : null}
      </div>
    </>
  );
}
