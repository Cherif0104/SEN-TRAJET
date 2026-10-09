"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, LoaderCircle, MapPin, X } from "lucide-react";
import type { Place } from "@/lib/types";

export function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  allowGeolocation
}: {
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  allowGeolocation?: boolean;
}) {
  const [query, setQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.address);
  }, [value]);

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/places?q=${encodeURIComponent(query.trim())}`)
        .then((response) => response.json())
        .then((data: { suggestions?: Place[] }) => {
          if (active) setSuggestions(data.suggestions || []);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, value]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          .then((response) => response.json())
          .then((data: { place: Place }) => onChange(data.place))
          .finally(() => setLocating(false));
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  return (
    <div className="location-box" ref={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <label style={{ color: "#586474", fontSize: 11, fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</label>
        {allowGeolocation ? (
          <button type="button" onClick={locate} disabled={locating} style={{ border: 0, background: "transparent", color: "var(--gold-deep)", fontSize: 11, fontWeight: 850, display: "flex", alignItems: "center", gap: 5 }}>
            {locating ? <LoaderCircle className="pulse-dot" size={15} /> : <Crosshair size={15} />}
            Ma position
          </button>
        ) : null}
      </div>
      <div style={{ minHeight: 56, border: `1.5px solid ${value ? "#43b786" : "#d9dfe6"}`, borderRadius: 18, background: "white", display: "flex", alignItems: "center", paddingInline: 13 }}>
        <MapPin size={20} color={value ? "var(--green)" : "var(--gold-deep)"} />
        <input
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
          }}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, padding: "15px 10px", background: "transparent" }}
        />
        {loading ? <LoaderCircle size={17} className="pulse-dot" /> : null}
        {query && !loading ? (
          <button type="button" aria-label="Effacer" onClick={() => { setQuery(""); onChange(null); }} style={{ width: 32, height: 32, border: 0, borderRadius: 12, background: "#f1f3f5", display: "grid", placeItems: "center" }}>
            <X size={15} />
          </button>
        ) : null}
      </div>
      {suggestions.length ? (
        <div className="suggestions">
          {suggestions.map((place) => (
            <button
              key={place.id}
              type="button"
              className="suggestion"
              onClick={() => {
                onChange(place);
                setQuery(place.address);
                setSuggestions([]);
              }}
            >
              <MapPin size={18} color="var(--gold-deep)" style={{ flex: "0 0 auto", marginTop: 2 }} />
              <span>
                <strong style={{ display: "block", fontSize: 14 }}>{place.label}</strong>
                <small className="muted" style={{ display: "block", marginTop: 3, lineHeight: 1.35 }}>{place.address}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
