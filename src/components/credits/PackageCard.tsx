"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CreditPackage } from "@/lib/wallet";

type Props = {
  pkg: CreditPackage;
  selected?: boolean;
  onSelect: (pkg: CreditPackage) => void;
};

export function PackageCard({ pkg, selected, onSelect }: Props) {
  const pricePerCredit = Math.round(pkg.price_fcfa / pkg.credits);
  const isBestValue = pkg.credits >= 50;

  return (
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      className={`relative w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
      }`}
    >
      {isBestValue && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-white">
          Meilleur rapport
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-neutral-900">{pkg.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {pkg.credits} crédits
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-neutral-900">
            {pkg.price_fcfa.toLocaleString("fr-FR")}
          </p>
          <p className="text-xs text-neutral-400">
            FCFA · {pricePerCredit} FCFA/crédit
          </p>
        </div>
      </div>
    </button>
  );
}
