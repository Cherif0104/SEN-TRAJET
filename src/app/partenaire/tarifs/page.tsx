"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId } from "@/lib/partners";
import {
  getActivePartnerContract,
  listPartnerContracts,
  type PartnerPricingContract,
} from "@/lib/partnerPricing";

export default function PartenaireTarifsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<PartnerPricingContract | null>(null);
  const [history, setHistory] = useState<PartnerPricingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const partner = await getPartnerByUserId(user.id);
        if (!partner) return;
        const [a, all] = await Promise.all([
          getActivePartnerContract(partner.id),
          listPartnerContracts(partner.id),
        ]);
        setActive(a);
        setHistory(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes tarifs partenaires</h1>
      <p className="mt-1 text-neutral-600">
        Grilles et remises négociées avec SentraJet Premium.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
      ) : !active ? (
        <Card className="mt-4">
          <p className="text-sm text-neutral-600">
            Aucun contrat actif. Contactez SentraJet pour activer vos tarifs B2B.
          </p>
        </Card>
      ) : (
        <Card className="mt-4">
          <h2 className="text-base font-semibold text-neutral-900">{active.name}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Remise globale : <strong>{active.discount_percent}%</strong>
          </p>
          {active.notes && (
            <p className="mt-2 text-sm text-neutral-500">{active.notes}</p>
          )}
          {active.route_prices.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-neutral-800">Prix fixes par corridor</h3>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                {active.route_prices.map((r, i) => (
                  <li key={`${r.from_city}-${r.to_city}-${i}`}>
                    {r.from_city} → {r.to_city} : {r.price_fcfa.toLocaleString("fr-FR")} FCFA
                    {r.vehicle_category ? ` (${r.vehicle_category})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {history.length > 1 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-neutral-900">Historique</h2>
          <div className="mt-3 space-y-2">
            {history.map((c) => (
              <Card key={c.id}>
                <p className="text-sm font-medium text-neutral-900">
                  {c.name} · {c.is_active ? "Actif" : "Inactif"}
                </p>
                <p className="text-xs text-neutral-500">
                  Remise {c.discount_percent}% · depuis{" "}
                  {new Date(c.active_from).toLocaleDateString("fr-FR")}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
