"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocode";
import { suggestSenegalLocations } from "@/lib/mapsInteractive";
import { MapPin } from "lucide-react";

type LocationSmartInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  listId: string;
  /** Affiche le bouton « Utiliser ma position » (désactiver si le parent fournit déjà la géoloc). */
  showGeolocationButton?: boolean;
};

export function LocationSmartInput({
  label,
  value,
  onChange,
  placeholder,
  listId,
  showGeolocationButton = true,
}: LocationSmartInputProps) {
  const { getPosition, loading } = useGeolocation({ enableHighAccuracy: true, timeout: 12000 });
  const [geoError, setGeoError] = useState<string | null>(null);
  const suggestions = useMemo(() => suggestSenegalLocations(value), [value]);

  const useCurrentLocation = async () => {
    setGeoError(null);
    const res = await getPosition();
    if (!res.ok) {
      setGeoError(res.error);
      return;
    }
    const labelFromMap = await reverseGeocode(res.position.lat, res.position.lng);
    if (labelFromMap) onChange(labelFromMap);
    else setGeoError("Adresse introuvable pour cette position.");
  };

  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
      />
      <datalist id={listId}>
        {suggestions.map((item) => (
          <option key={`${listId}-${item.label}`} value={item.label} />
        ))}
      </datalist>
      {showGeolocationButton && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2"
          isLoading={loading}
          onClick={useCurrentLocation}
        >
          <MapPin className="mr-1 h-4 w-4" /> Utiliser ma position
        </Button>
      )}
      {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
    </div>
  );
}

