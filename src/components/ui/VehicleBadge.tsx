"use client";

import { Car, Bus, Truck } from "lucide-react";

type VehicleBadgeProps = {
  name?: string | null;
  category?: string | null;
  /** Nombre de places ou libellé type "3/4" (disponibles / total) */
  seats?: number | string | null;
};

function seatCountForIcon(seats?: number | string | null): number | null {
  if (seats == null) return null;
  if (typeof seats === "number") return seats;
  const m = seats.match(/^(\d+)\s*\/\s*(\d+)/);
  if (m) return Number(m[2]);
  const n = Number.parseInt(String(seats), 10);
  return Number.isFinite(n) ? n : null;
}

function getVehicleIcon(category?: string | null, seats?: number | string | null) {
  const normalized = (category || "").toLowerCase();
  if (normalized.includes("utilitaire") || normalized.includes("cargo")) {
    return Truck;
  }
  const n = seatCountForIcon(seats);
  if (normalized.includes("minibus") || (n ?? 0) >= 7) {
    return Bus;
  }
  return Car;
}

export function VehicleBadge({ name, category, seats }: VehicleBadgeProps) {
  const Icon = getVehicleIcon(category, seats);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate max-w-[120px]">
        {name || "Véhicule"}
      </span>
      {typeof seats === "number" && seats > 0 && (
        <span className="text-neutral-500">{seats} places</span>
      )}
      {typeof seats === "string" && seats.trim() !== "" && (
        <span className="text-neutral-500">
          {seats.includes("/") ? `${seats.replace(/\s*\/\s*/, " / ")} places` : `${seats} places`}
        </span>
      )}
      {category && (
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
          {category}
        </span>
      )}
    </div>
  );
}

