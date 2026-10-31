import data from "./atl-neighbourhoods.json";

// Simplified City of Atlanta neighbourhood polygons (about 15 m). Import lazily where it is needed: the file is about 110 KB.
type Ring = [number, number][];
const hoods = data.hoods as { name: string; polys: Ring[][] }[];

function inRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Official neighbourhood name for a point, or null outside the city layer. */
export function neighbourhoodAt(lat: number, lng: number): string | null {
  for (const h of hoods) {
    for (const poly of h.polys) {
      if (inRing(poly[0], lng, lat) && !poly.slice(1).some((hole) => inRing(hole, lng, lat))) return h.name;
    }
  }
  return null;
}
export const neighbourhoodSource = data.source;
