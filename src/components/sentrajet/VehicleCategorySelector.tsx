"use client";

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
    <div style={{ gridColumn: "1 / -1" }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          opacity: 0.65,
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        {ORDER.map((category) => {
          const isSelected = value === category;
          const rate = rates[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              style={{
                textAlign: "left",
                borderRadius: 14,
                border: isSelected ? "2px solid #d4a83f" : "1px solid rgba(148,163,184,0.4)",
                background: isSelected ? "rgba(212,168,63,0.14)" : "transparent",
                padding: "10px 12px",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{VEHICLE_CATEGORY_LABELS[category]}</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                {VEHICLE_CATEGORY_SEATS[category]} places · {CATEGORY_HINTS[category]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                à partir de {formatFcfa(rate.baseFcfa)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>
                {flatRateMaxKm} km inclus, puis {formatFcfa(rate.extraKmFcfa)}/km
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
