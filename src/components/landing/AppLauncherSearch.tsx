"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LocateFixed, Plane, Clock, PartyPopper, MapPin as MapPinIcon } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocode";

const QUICK_SHORTCUTS = [
  { icon: Plane, label: "Aéroport", href: "/reserver?service=transfert_aibd" },
  { icon: Clock, label: "Course VIP", href: "/course?class=vip" },
  { icon: PartyPopper, label: "Cérémonie", href: "/reserver?service=ceremonie" },
  { icon: MapPinIcon, label: "Interurbain", href: "/interurbain" },
];

/**
 * Carte de recherche rapide façon app VTC (Uber/Yango) : position détectée automatiquement +
 * destination en un geste. Flottante sur le hero pour que l'accueil ressemble à l'écran
 * principal d'une app, pas à une page marketing. La détection GPS est purement informative ici
 * (ambiance « app ») — la confirmation réelle du point de départ se fait toujours sur /reserver
 * via une suggestion GPS explicite, jamais injectée automatiquement dans la réservation.
 */
export function AppLauncherSearch() {
  const router = useRouter();
  const { position, getPosition } = useGeolocation({ enableHighAccuracy: false, timeout: 8000 });
  const [positionLabel, setPositionLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [destination, setDestination] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLocating(true);
    void getPosition().finally(() => {
      if (!cancelled) setLocating(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    void reverseGeocode(position.lat, position.lng).then((label) => {
      if (!cancelled && label) setPositionLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [position]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("destination", destination.trim());
    router.push(`/reserver${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="relative z-10 mx-auto -mt-6 max-w-xl rounded-3xl bg-white p-4 shadow-2xl sm:-mt-8 sm:p-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Départ</p>
            <p className="truncate text-sm font-semibold text-neutral-900">
              {locating ? "Détection de votre position…" : positionLabel || "Position à confirmer sur place"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50/60 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[#07111f]">
            <MapPinIcon className="h-4 w-4" />
          </span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Où allez-vous ?"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-500 placeholder:font-normal focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Réserver"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#07111f] text-white transition hover:bg-black"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_SHORTCUTS.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-amber-400 hover:text-amber-800"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
