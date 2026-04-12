import clsx from "clsx";

export type TripType =
  | "interurbain_location"
  | "interurbain_covoiturage"
  | "urbain"
  | "aeroport"
  | "colis";

const LABELS: Record<TripType, string> = {
  interurbain_location: "Location",
  interurbain_covoiturage: "Covoiturage",
  urbain: "Urbain",
  aeroport: "Aéroport",
  colis: "Colis",
};

const STYLES: Record<TripType, string> = {
  interurbain_location: "bg-amber-100 text-amber-800",
  interurbain_covoiturage: "bg-primary/10 text-primary",
  urbain: "bg-blue-100 text-blue-800",
  aeroport: "bg-sky-100 text-sky-800",
  colis: "bg-emerald-100 text-emerald-800",
};

interface TripTypeBadgeProps {
  tripType: TripType | string | null | undefined;
  className?: string;
}

export function TripTypeBadge({ tripType, className }: TripTypeBadgeProps) {
  if (!tripType) return null;
  const type = tripType as TripType;
  const label = LABELS[type] ?? type;
  const style = STYLES[type] ?? "bg-neutral-100 text-neutral-700";
  return (
    <span
      className={clsx(
        "inline-block rounded-lg px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
