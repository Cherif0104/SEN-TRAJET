"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { listPartnersAdmin } from "@/lib/adminOps";
import type { Partner } from "@/lib/partners";
import { getActivePartnerContract } from "@/lib/partnerPricing";

type PartnerRow = Partner & { contractLabel?: string };

export default function AdminPartenairesPage() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const partners = await listPartnersAdmin();
        const withContracts = await Promise.all(
          partners.map(async (p) => {
            try {
              const contract = await getActivePartnerContract(p.id);
              return {
                ...p,
                contractLabel: contract
                  ? `${contract.name} (−${contract.discount_percent}%)`
                  : "Aucun contrat actif",
              };
            } catch {
              return { ...p, contractLabel: "—" };
            }
          })
        );
        setRows(withContracts);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Partenaires B2B</h1>
      <p className="mt-1 text-neutral-600">
        Entreprises et structures qui réservent à tarifs négociés.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-neutral-500">Aucun partenaire.</p>
        </Card>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Société</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Contrat</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.company_name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {row.contact_name || row.phone || row.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {row.account_type || "b2b_client"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{row.contractLabel}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {row.is_active ? "Actif" : "Inactif"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
