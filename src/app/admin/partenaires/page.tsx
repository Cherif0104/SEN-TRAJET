"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { bookingStatusTone, listPartnerContracts, type PartnerContract } from "@/lib/platformOps";

export default function AdminPartenairesPage() {
  const [rows, setRows] = useState<PartnerContract[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listPartnerContracts()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  return (
    <>
      <SjSectionHead eyebrow="Réseau" title="Partenaires B2B" />
      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Partenaire</th>
                <th>Contrat</th>
                <th>Début</th>
                <th>Statut</th>
                <th>Tarification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.partner_name}</b>
                  </td>
                  <td>{p.contract_number}</td>
                  <td>{p.start_date}</td>
                  <td>
                    <SjBadge tone={bookingStatusTone(p.status)}>{p.status}</SjBadge>
                  </td>
                  <td>{p.status === "active" ? "700 F/km · AIBD B2B" : "Tarif direct"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? <p className="sj-muted" style={{ marginTop: 12 }}>Aucun partenaire.</p> : null}
      </SjCard>
    </>
  );
}
