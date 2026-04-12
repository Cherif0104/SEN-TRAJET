"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import {
  getPartnerByUserId,
  getPartnerCommissions,
  getCommissionConfig,
  type PartnerCommission,
  type CommissionConfig,
} from "@/lib/partners";
import { Coins, ArrowLeft, CreditCard, TrendingUp } from "lucide-react";

type Filter = "all" | "pending" | "paid";

export default function PartenaireCommissionsPage() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user?.id) return;
    getPartnerByUserId(user.id)
      .then((partner) => {
        if (partner) {
          void getCommissionConfig(partner.id).then(setCommissionConfig);
          return getPartnerCommissions(partner.id);
        }
        return [];
      })
      .then(setCommissions)
      .catch(() => setCommissions([]));
  }, [user?.id]);

  const pending = commissions.filter((c) => c.status === "pending");
  const paid = commissions.filter((c) => c.status === "paid");
  const pendingSum = pending.reduce((s, c) => s + c.amount_fcfa, 0);
  const paidSum = paid.reduce((s, c) => s + c.amount_fcfa, 0);

  const filtered =
    filter === "pending" ? pending : filter === "paid" ? paid : commissions;

  return (
    <>
      <div>
        <Link
          href="/partenaire"
          className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Commissions</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Commissions sur recharges de crédits et trajets réalisés par vos chauffeurs.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Coins className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500">En attente</h3>
              <p className="text-2xl font-bold text-neutral-900">
                {pendingSum.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-xs text-neutral-500">Non encore versées</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500">Déjà versées</h3>
              <p className="text-2xl font-bold text-neutral-900">
                {paidSum.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-xs text-neutral-500">Historique des versements</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Regles de commission actives</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Plateforme: {(commissionConfig?.platform_percent ?? 10).toLocaleString("fr-FR")}%
          {" · "}
          Partenaire: {(commissionConfig?.partner_percent ?? 4).toLocaleString("fr-FR")}%
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Ces valeurs sont modulables par l&apos;administration de la plateforme.
        </p>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="font-medium text-neutral-900">Détail des commissions</h3>
          <div className="flex rounded-lg border border-neutral-200 p-1">
            {(["all", "pending", "paid"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {f === "all" ? "Toutes" : f === "pending" ? "En attente" : "Versées"}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <TrendingUp className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="mt-4 font-medium text-neutral-700">
              {filter === "all"
                ? "Aucune commission pour l'instant"
                : filter === "pending"
                  ? "Aucune commission en attente"
                  : "Aucun versement effectué"}
            </p>
            <p className="mt-2 max-w-sm text-sm text-neutral-500">
              Les commissions sont générées lorsque vos chauffeurs rechargent des crédits ou réalisent des trajets.
            </p>
            <Link
              href="/partenaire"
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Retour au tableau de bord
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <div>
                  <p className="font-medium text-neutral-900">
                    {c.type === "credit_purchase" ? "Recharge crédits" : "Trajet réalisé"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {typeof c.driver === "object" && c.driver?.full_name
                      ? c.driver.full_name
                      : "Chauffeur"}
                  </p>
                  {c.reference && (
                    <p className="text-xs text-neutral-400">{c.reference}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900">
                    +{c.amount_fcfa.toLocaleString("fr-FR")} FCFA
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      c.status === "paid" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {c.status === "paid" ? "Versé" : "En attente"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
