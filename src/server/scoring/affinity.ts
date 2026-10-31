import type { Face, HeatCell } from "@/contract";

// Per-face affinity from Qloo heat cells: inverse-distance weighting over every cell within REACH_M of the face.
// A face with no cell in reach has no evidence and is dropped by the filters: a missing cell is never read as zero taste.
export const REACH_M = 1500;
const SOFTEN_M = 150; // cells are ~0.6 x 1.2 km: distance is meaningless below about this scale

const R = 6371000;
const rad = Math.PI / 180;
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface FaceAffinity {
  affinity: number; // 0..1
  cells: number; // cells in reach
  nearestM: number | null;
}

export function faceAffinity(face: Pick<Face, "lat" | "lng">, heat: HeatCell[], reachM = REACH_M): FaceAffinity {
  let wSum = 0;
  let aSum = 0;
  let cells = 0;
  let nearest = Infinity;
  for (const c of heat) {
    const d = haversineM(face, c);
    if (d > reachM) continue;
    const w = 1 / (d + SOFTEN_M) ** 2;
    wSum += w;
    aSum += w * c.affinity;
    cells++;
    if (d < nearest) nearest = d;
  }
  return cells ? { affinity: Math.max(0, Math.min(1, aSum / wSum)), cells, nearestM: Math.round(nearest) } : { affinity: 0, cells: 0, nearestM: null };
}
