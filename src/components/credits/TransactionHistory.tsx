"use client";

import { ArrowUpCircle, ArrowDownCircle, RotateCcw, Gift } from "lucide-react";
import type { Transaction } from "@/lib/wallet";

const ICONS = {
  recharge: ArrowUpCircle,
  debit: ArrowDownCircle,
  refund: RotateCcw,
  bonus: Gift,
} as const;

const COLORS = {
  recharge: "text-green-600",
  debit: "text-red-500",
  refund: "text-blue-500",
  bonus: "text-amber-500",
} as const;

const LABELS = {
  recharge: "Recharge",
  debit: "Débit",
  refund: "Remboursement",
  bonus: "Bonus",
} as const;

type Props = {
  transactions: Transaction[];
};

export function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-400">
        Aucune transaction
      </p>
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {transactions.map((tx) => {
        const Icon = ICONS[tx.type] || ArrowDownCircle;
        const color = COLORS[tx.type] || "text-neutral-500";

        return (
          <div key={tx.id} className="flex items-center gap-3 py-3">
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900">
                {LABELS[tx.type]}
              </p>
              {tx.description && (
                <p className="truncate text-xs text-neutral-400">
                  {tx.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  tx.credits > 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {tx.credits > 0 ? "+" : ""}
                {tx.credits}
              </p>
              <p className="text-xs text-neutral-400">
                {new Date(tx.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
