"use client";

import { CarFront, CheckCircle2, UsersRound } from "lucide-react";
import {
  DEFAULT_FLAT_RATE_MAX_KM,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_SEATS,
  formatFcfa,
  type VehicleCategory,
  type VehicleCategoryRates,
} from "@/lib/sentrajetPricing";

const ORDER: VehicleCategory[] = ["berline", "suv", "van"];

const CATEGORY_HINTS: Record<VehicleCategory, string> = {
  berline: "Confort, discrétion — 1 à 3 passagers",
  suv: "Plus d’espace, garde au sol — 1 à 4 passagers + bagages",
  van: "Groupes ou nombreux bagages — jusqu’à 7-9 passagers",
};

type Props = {
  value: VehicleCategory;
  onChange: (category: VehicleCategory) => void;
  rates: VehicleCategoryRates;
  flatRateMaxKm?: number;
  label?: string;
};

/**
 * Sélecteur de catégorie de véhicule (Berline / SUV / Van) pour les transferts aéroport — pilote
 * le tarif forfaitaire "à partir de X FCFA" au lieu du moteur générique passagers/km. Réutilisé
 * dans le formulaire staff, l'assistant partenaire et le simulateur public.
 */
export function VehicleCategorySelector({
  value,
  onChange,
  rates,
  flatRateMaxKm = DEFAULT_FLAT_RATE_MAX_KM,
  label = "Catégorie de véhicule",
}: Props) {
  return (
    <div className="col-span-full">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="grid gap-3">
        {ORDER.map((category) => {
          const isSelected = value === category;
          const rate = rates[category];
          const CategoryIcon = category === "van" ? UsersRound : CarFront;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={`relative flex min-h-[116px] items-center gap-4 rounded-[1.25rem] border p-4 text-left transition ${
                isSelected
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                  : "border-slate-200 bg-white hover:border-amber-300"
              }`}
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                isSelected ? "bg-amber-400 text-[#07111f]" : "bg-slate-100 text-slate-600"
              }`}>
                <CategoryIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold text-slate-900">{VEHICLE_CATEGORY_LABELS[category]}</span>
                  {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-700" /> : null}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  {VEHICLE_CATEGORY_SEATS[category]} places · {CATEGORY_HINTS[category]}
                </div>
                <div className="mt-2 text-sm font-extrabold text-slate-900">
                  Dès {formatFcfa(rate.baseFcfa)}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  {flatRateMaxKm} km inclus · puis {formatFcfa(rate.extraKmFcfa)}/km
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
