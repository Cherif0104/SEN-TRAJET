"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type SelectedPlace = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  source: string;
};

type Suggestion = {
  id: string;
  label: string;
  secondary?: string;
  lat?: number;
  lng?: number;
  source: string;
};

type Props = {
  label: string;
  placeholder?: string;
  value: SelectedPlace | null;
  textValue?: string;
  onSelect: (place: SelectedPlace) => void;
  onClear?: () => void;
  showMyLocation?: boolean;
};

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  textValue,
  onSelect,
  onClear,
  showMyLocation = false,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState(value?.address || value?.label || textValue || "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.address || value.label);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    // Ne pas relancer si déjà sélectionné à l’identique
    if (value && (q === value.address || q === value.label)) return;

    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
          const data = (await res.json()) as { suggestions?: Suggestion[]; error?: string };
          if (cancelled) return;
          if (!res.ok) throw new Error(data.error || "Recherche indisponible");
          setItems(data.suggestions ?? []);
          setOpen(true);
        } catch (e) {
          if (!cancelled) {
            setItems([]);
            setError(e instanceof Error ? e.message : "Erreur recherche");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, value]);

  async function pick(s: Suggestion) {
    setError(null);
    try {
      let lat = s.lat;
      let lng = s.lng;
      let address = s.secondary || s.label;

      if (s.id.startsWith("google:")) {
        const res = await fetch(`/api/places/details?id=${encodeURIComponent(s.id)}`);
        if (!res.ok) throw new Error("Impossible de localiser cette adresse Google.");
        const data = (await res.json()) as {
          lat: number;
          lng: number;
          address?: string;
          label?: string;
        };
        lat = data.lat;
        lng = data.lng;
        address = data.address || data.label || s.label;
      }

      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Cette suggestion n’a pas de coordonnées. Choisissez une autre adresse.");
      }

      const place: SelectedPlace = {
        id: s.id,
        label: s.label,
        address,
        lat,
        lng,
        source: s.source,
      };
      setQuery(place.address);
      setOpen(false);
      setItems([]);
      onSelect(place);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sélection impossible");
    }
  }

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Géolocalisation indisponible.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const data = res.ok
            ? ((await res.json()) as {
                label?: string | null;
                display_name?: string | null;
                fallback?: string | null;
              })
            : {};
          const address =
            data.label ||
            data.display_name ||
            data.fallback ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          const place: SelectedPlace = {
            id: `geo:${latitude},${longitude}`,
            label: "Ma position",
            address,
            lat: latitude,
            lng: longitude,
            source: "geolocation",
          };
          setQuery(place.address);
          onSelect(place);
        } catch {
          setError("Adresse introuvable pour cette position.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setError("Impossible d’obtenir la position.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</label>
      <div className="relative mt-1">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
        <input
          className="input-base pl-9"
          value={query}
          placeholder={placeholder || "Tapez une adresse…"}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onClear?.();
          }}
          onFocus={() => {
            if (items.length) setOpen(true);
          }}
        />
      </div>
      {showMyLocation ? (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoLoading}
          className="mt-1 text-xs font-semibold text-amber-800 disabled:opacity-50"
        >
          {geoLoading ? "Localisation…" : "Utiliser ma position"}
        </button>
      ) : null}
      {loading ? <p className="mt-1 text-xs text-neutral-400">Recherche d’adresses…</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {value ? (
        <p className="mt-1 text-xs text-emerald-700">Adresse confirmée · coords GPS OK</p>
      ) : query.trim().length >= 2 ? (
        <p className="mt-1 text-xs text-amber-800">Choisissez une suggestion pour un km réel.</p>
      ) : null}

      {open && items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-amber-50"
                onClick={() => void pick(s)}
              >
                <span className="text-sm font-semibold text-neutral-900">{s.label}</span>
                {s.secondary ? <span className="text-xs text-neutral-500">{s.secondary}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
