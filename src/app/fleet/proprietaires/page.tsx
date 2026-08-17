"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone } from "@/lib/platformOps";
import { listAllOwners, type FleetOwner } from "@/lib/fleetOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function FleetProprietairesPage() {
  const [owners, setOwners] = useState<FleetOwner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAllOwners()
      .then(setOwners)
      .catch(() => setOwners([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Fleet Manager" title="Propriétaires de véhicules" />
      <div className="sj-list">
        {owners.map((o) => (
          <Link key={o.id} href={`/admin/proprietaires/${o.id}`}>
            <SjCard>
              <div className="sj-between">
                <div>
                  <b>{o.full_name || o.company_name || "Propriétaire"}</b>
                  <div className="sj-muted">{o.matricule || "—"} · {o.phone || "—"} · {o.partner_kind || "—"}</div>
                </div>
                <SjBadge tone={bookingStatusTone(o.status)}>{o.status}</SjBadge>
              </div>
            </SjCard>
          </Link>
        ))}
        {!owners.length ? <SjCard><p className="sj-muted">Aucun propriétaire enregistré.</p></SjCard> : null}
      </div>
    </>
  );
}
