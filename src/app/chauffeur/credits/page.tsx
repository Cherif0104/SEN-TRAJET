"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TransactionHistory } from "@/components/credits/TransactionHistory";
import { useAuth } from "@/hooks/useAuth";
import { getWallet, getTransactions, type Wallet, type Transaction } from "@/lib/wallet";
import {
  getDriverTripPublishingState,
  TRIP_PUBLICATION_COST_FCFA,
  type DriverTripPublishingState,
} from "@/lib/tripPublishing";
import { Coins, Plus } from "lucide-react";

export default function CreditsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [publishingState, setPublishingState] = useState<DriverTripPublishingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWallet(user.id), getTransactions(user.id), getDriverTripPublishingState(user.id)])
      .then(([w, txs, state]) => {
        setWallet(w);
        setTransactions(txs);
        setPublishingState(state);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 rounded bg-neutral-200" />
        <div className="h-24 rounded-xl bg-neutral-200" />
        <div className="h-40 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Crédits</h1>
      <p className="mt-1 text-neutral-600">
        Rechargez pour publier des trajets et répondre aux demandes.
      </p>

      <Card className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Coins className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Solde actuel</p>
            <p className="text-3xl font-bold text-neutral-900">
              {wallet?.balance_credits ?? 0}
              <span className="ml-1 text-base font-normal text-neutral-400">
                crédits
              </span>
            </p>
          </div>
        </div>
        <Button href="/chauffeur/credits/recharger">
          <Plus className="mr-1 h-4 w-4" /> Recharger
        </Button>
      </Card>
      {publishingState && (
        <Card className="mt-3 border border-sky-200 bg-sky-50/50">
          <p className="text-sm font-semibold text-sky-900">Règle publication</p>
          <p className="mt-1 text-xs text-sky-800">
            {publishingState.freeTripsRemaining} trajet(s) gratuit(s) restant(s), puis{" "}
            {TRIP_PUBLICATION_COST_FCFA.toLocaleString("fr-FR")} FCFA par trajet publié (1 crédit).
          </p>
          <p className="mt-1 text-xs text-sky-800">
            Découvert max: 2 trajets (soit -2000 FCFA) · Restant: {publishingState.loanRemainingTrips} trajet(s).
          </p>
        </Card>
      )}

      {(wallet?.balance_credits ?? 0) <= 5 && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Solde faible ! Rechargez vos crédits pour continuer à recevoir des
          demandes.
        </div>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold text-neutral-900">
          Historique des transactions
        </h2>
        <div className="mt-3">
          <TransactionHistory transactions={transactions} />
        </div>
      </Card>
    </>
  );
}
