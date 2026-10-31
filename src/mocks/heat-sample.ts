// SAMPLE DATA: invented brand, faces, rates and scores for the demo; replaced by the API in DATA_MODE=app.
// Deterministic audience heat over Atlanta: gaussian blobs on the strong blocks plus seeded noise.
import type { HeatCell } from "@/contract";

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function geohash(lat: number, lng: number, precision = 7): string {
  let latLo = -90, latHi = 90, lngLo = -180, lngHi = 180;
  let hash = "", bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngLo + lngHi) / 2;
      if (lng >= mid) { ch = (ch << 1) | 1; lngLo = mid; } else { ch <<= 1; lngHi = mid; }
    } else {
      const mid = (latLo + latHi) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latLo = mid; } else { ch <<= 1; latHi = mid; }
    }
    even = !even;
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

// Seeded LCG so the sample heat renders identically every time.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// [lat, lng, weight, sigma in degrees]
const BLOBS: [number, number, number, number][] = [
  [33.7643, -84.3494, 0.94, 0.011], // Little Five Points
  [33.7726, -84.372, 0.89, 0.011], // Old Fourth Ward
  [33.7369, -84.4134, 0.86, 0.012], // West End
  [33.7404, -84.3456, 0.81, 0.01], // East Atlanta Village
  [33.7555, -84.3395, 0.78, 0.008], // Edgewood
  [33.7487, -84.4005, 0.74, 0.008], // Castleberry Hill
  [33.7533, -84.3193, 0.71, 0.01], // Kirkwood
  [33.7465, -84.3497, 0.68, 0.007], // Reynoldstown
  [33.7375, -84.428, 0.6, 0.01], // Westview
  [33.7816, -84.3537, 0.55, 0.012], // Virginia-Highland
  [33.7812, -84.3838, 0.5, 0.012], // Midtown
  [33.841, -84.372, 0.44, 0.024], // Buckhead (weak)
];

function buildHeat(): HeatCell[] {
  const rand = lcg(20261116);
  const cells: HeatCell[] = [];
  for (let lat = 33.7; lat <= 33.8601; lat += 0.01) {
    for (let lng = -84.46; lng <= -84.2999; lng += 0.01) {
      const cLat = lat + (rand() - 0.5) * 0.004;
      const cLng = lng + (rand() - 0.5) * 0.004;
      const parts = BLOBS.map(([bLat, bLng, w, sigma]) => {
        const d2 = (cLat - bLat) ** 2 + (cLng - bLng) ** 2;
        return w * Math.exp(-d2 / (2 * sigma * sigma));
      });
      const max = Math.max(...parts);
      const sum = parts.reduce((a, b) => a + b, 0);
      const background = 0.06 + rand() * 0.08;
      const affinity = Math.min(1, Math.max(background, max + 0.12 * (sum - max)) + (rand() - 0.5) * 0.03);
      if (affinity < 0.07) continue;
      const a = Math.round(Math.max(0, affinity) * 1000) / 1000;
      const r = (n: number) => Math.round(n * 100000) / 100000;
      cells.push({ geohash: geohash(cLat, cLng), lat: r(cLat), lng: r(cLng), affinity: a });
    }
  }
  return cells;
}

export const sampleHeat: HeatCell[] = buildHeat();
