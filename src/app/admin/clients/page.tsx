"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { listProfilesByRole, type AdminProfileRow } from "@/lib/adminOps";

export default function AdminClientsPage() {
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProfilesByRole("client")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Clients</h1>
      <p className="mt-1 text-neutral-600">
        Voyageurs et expéditeurs inscrits sur la plateforme.
      </p>
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-neutral-500">Aucun client pour l’instant.</p>
        </Card>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{row.phone || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.city || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(row.created_at).toLocaleDateString("fr-FR")}
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
