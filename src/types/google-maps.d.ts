/**
 * Déclarations minimales pour l'API Google Maps (chargée via script).
 */
declare namespace google.maps {
  interface MapOptions {
    center?: { lat: number; lng: number };
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    styles?: unknown[];
  }

  class Map {
    constructor(mapDiv: HTMLElement, opts?: MapOptions);
    fitBounds(bounds: { north: number; south: number; east: number; west: number }, padding?: { top?: number; right?: number; bottom?: number; left?: number }): void;
  }

  interface MarkerOptions {
    position: { lat: number; lng: number };
    map?: Map;
    title?: string;
    label?: string;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
  }
}

declare global {
  interface Window {
    google?: {
      maps: typeof google.maps;
    };
  }
}

export {};
