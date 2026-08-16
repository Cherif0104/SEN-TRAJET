"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, LocateFixed, MapPin, X } from "lucide-react";

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
  accent?: "pickup" | "dropoff";
};

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  textValue,
  onSelect,
  onClear,
  showMyLocation = false,
  accent = "pickup",
}: Props) {
  const listId = useId();
  const inputId = `${listId}-input`;
  const [query, setQuery] = useState(value?.address || value?.label || textValue || "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pinColor = accent === "dropoff" ? "text-[#d5a64a]" : "text-emerald-600";

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
    }, 250);
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
      let address = [s.label, s.secondary].filter(Boolean).join(", ");

      if (s.id.startsWith("google:")) {
        const res = await fetch(`/api/places/details?id=${encodeURIComponent(s.id)}`);
        if (!res.ok) throw new Error("Impossible de localiser cette adresse.");
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
        throw new Error("Choisissez une suggestion avec GPS.");
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
      setError("Géolocalisation indisponible sur cet appareil.");
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
            data.display_name ||
            data.label ||
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
          setOpen(false);
          onSelect(place);
        } catch {
          setError("Adresse introuvable pour cette position.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setError("Autorisez la localisation ou tapez votre adresse.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function clear() {
    setQuery("");
    setItems([]);
    setOpen(false);
    setError(null);
    onClear?.();
    inputRef.current?.focus();
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          {label}
        </label>
        {showMyLocation ? (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 disabled:opacity-50"
          >
            {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            {geoLoading ? "Localisation…" : "Ma position"}
          </button>
        ) : null}
      </div>

      <div
        className={`relative flex items-center rounded-2xl border-2 bg-white transition ${
          value
            ? "border-emerald-400/80 shadow-sm"
            : open
              ? "border-amber-500 ring-2 ring-amber-500/15"
              : "border-neutral-200"
        }`}
      >
        <MapPin className={`ml-3 h-5 w-5 shrink-0 ${pinColor}`} />
        <input
          ref={inputRef}
          id={inputId}
          name={`${accent}_address`}
          className="min-h-[52px] w-full bg-transparent px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          value={query}
          placeholder={placeholder || "Rechercher une adresse…"}
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
        {loading ? (
          <Loader2 className="mr-3 h-4 w-4 shrink-0 animate-spin text-neutral-400" />
        ) : value ? (
          <Check className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
        ) : query ? (
          <button type="button" onClick={clear} className="mr-2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100" aria-label="Effacer">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {!value && query.trim().length >= 2 && !loading ? (
        <p className="mt-1.5 text-xs text-amber-800">Touchez une suggestion pour verrouiller le GPS.</p>
      ) : null}
      {value ? (
        <p className="mt-1.5 text-xs font-medium text-emerald-700">Position GPS confirmée</p>
      ) : null}

      {open && items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-neutral-200 bg-white py-1 shadow-xl"
        >
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-amber-50"
                onClick={() => void pick(s)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  <span className="block text-sm font-semibold text-neutral-900">{s.label}</span>
                  {s.secondary ? (
                    <span className="mt-0.5 block text-xs text-neutral-500">{s.secondary}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
