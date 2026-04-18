/** Libellé de secours si le géocodage inverse ne renvoie pas de ville. */
export function formatCoordinatesLabel(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
