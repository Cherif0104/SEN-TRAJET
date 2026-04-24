"use client";

import { useEffect, useMemo, useState } from "react";
import { Map } from "@/components/map/Map";
import { Button } from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { MapMarker } from "@/components/map/Map";
import { Navigation, Pause } from "lucide-react";

export function UserLiveMap({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(true);
  const { position, error, getPosition, startWatching, stopWatching } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 15000,
    minAccuracyMeters: 1200,
    minDistanceMeters: 20,
  });

  useEffect(() => {
    if (!enabled) {
      stopWatching();
      return;
    }
    let mounted = true;
    getPosition().then((res) => {
      if (!mounted || !res.ok) return;
      startWatching();
    });
    return () => {
      mounted = false;
      stopWatching();
    };
  }, [enabled, getPosition, startWatching, stopWatching]);

  const markers: MapMarker[] = useMemo(() => {
    if (!position) return [];
    return [
      {
        lat: position.lat,
        lng: position.lng,
        label: `Ma position${position.accuracy ? ` (±${Math.round(position.accuracy)}m)` : ""}`,
        type: "trip",
      },
    ];
  }, [position]);

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-neutral-600">
          {enabled ? "Carte vivante activée" : "Carte vivante en pause"}
          {error && <span className="ml-2 text-xs text-amber-700">{error}</span>}
        </div>
        <Button
          size="sm"
          variant={enabled ? "secondary" : "primary"}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? <Pause className="mr-1 h-4 w-4" /> : <Navigation className="mr-1 h-4 w-4" />}
          {enabled ? "Pause" : "Activer"}
        </Button>
      </div>

      <Map height="260px" markers={markers.length > 0 ? markers : undefined} zoom={13} />
    </div>
  );
}

