"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TransactionHistory } from "@/components/credits/TransactionHistory";
import { useAuth } from "@/hooks/useAuth";
import { getWallet, getTransactions, type Wallet, type Transaction } from "@/lib/wallet";
import { Coins, Plus } from "lucide-react";

export default function CreditsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWallet(user.id), getTransactions(user.id)])
      .then(([w, txs]) => {
        setWallet(w);
        setTransactions(txs);
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
