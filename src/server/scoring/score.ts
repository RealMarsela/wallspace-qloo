import type { Face, HeatCell } from "@/contract";
import { faceAffinity } from "./affinity";

// How much of a passing audience a face kind gets to see, relative to a 14 x 48 ft bulletin (sample weights, not measured impressions).
const KIND_WEIGHT: Record<Face["kind"], number> = { bulletin: 1, digital_bulletin: 1.1, poster: 0.7, bus_shelter: 0.55, kiosk: 0.4 };

/** Visibility weight: kind, a small bonus for a lit face (read after dark) and for a larger area than the kind's standard. */
export function visibilityWeight(f: Pick<Face, "kind" | "lit" | "widthFt" | "heightFt">): number {
  const base = KIND_WEIGHT[f.kind];
  const std = f.kind === "poster" ? 22.8 * 10.5 : f.kind === "bus_shelter" ? 24 : f.kind === "kiosk" ? 21 : 48 * 14;
  const size = Math.max(0.9, Math.min(1.1, (f.widthFt * f.heightFt) / std));
  return Math.round(base * (f.lit ? 1.03 : 1) * size * 1000) / 1000;
}

export interface ScoredFace {
  face: Face;
  affinity: number; // 0..1 from the heat cells around the face
  score: number; // affinity x visibility weight x 100
  hasEvidence: boolean; // at least one heat cell in reach
}

/** Every face, best first. Faces without evidence score 0 and sort last: filter them with dropMissingEvidence. */
export function scoreFaces(faces: Face[], heat: HeatCell[]): ScoredFace[] {
  return faces
    .map((face): ScoredFace => {
      const a = faceAffinity(face, heat);
      return { face, affinity: Math.round(a.affinity * 1000) / 1000, score: Math.round(a.affinity * visibilityWeight(face) * 1000) / 10, hasEvidence: a.cells > 0 };
    })
    .sort((x, y) => y.score - x.score || x.face.id.localeCompare(y.face.id));
}

/** Evidence filter: faces with no Qloo cell in reach are dropped, and counted for the limits page. */
export function dropMissingEvidence(scored: ScoredFace[]): { kept: ScoredFace[]; dropped: ScoredFace[] } {
  return { kept: scored.filter((s) => s.hasEvidence), dropped: scored.filter((s) => !s.hasEvidence) };
}
