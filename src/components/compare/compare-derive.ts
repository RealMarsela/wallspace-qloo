import type { Face, Pick } from "@/contract";
import type { PlanData } from "@/lib/api-client";
import { parseLift, type Lift } from "@/components/landing/derive";
import type { ListOption } from "@/components/ui/Listbox";

export interface Block {
  face: Face;
  pick: Pick | null;
  affinity: number;
  /** Always "pick": the plan's scored affinity for the face's Qloo heatmap cell. */
  source: "pick";
}

// Only picked faces are comparable. The plan's stored heat grid is a normalised display layer (its top cells run 0.92 to 1),
// not the per-face affinity the scorer used, so reading an unpicked face's number off it would overstate it.
export function blockFor(data: PlanData, faceId: string): Block | null {
  const face = data.faces.find((f) => f.id === faceId);
  const pick = data.plan.picks.find((p) => p.faceId === faceId);
  if (!face || !pick) return null;
  return { face, pick, affinity: pick.affinity, source: "pick" };
}

/** Defaults: the top pick against the pick with the thinnest audience. */
export function defaultPair(data: PlanData): [string, string] | null {
  const picks = [...data.plan.picks].filter((p) => data.faces.some((f) => f.id === p.faceId)).sort((a, b) => a.rank - b.rank);
  if (picks.length < 2) return null;
  const rest = picks.slice(1).sort((a, b) => a.affinity - b.affinity);
  return [picks[0].faceId, rest[0].faceId];
}

/** The block's Qloo tags with their lift against Atlanta, from the pick's evidence. */
export function liftsFor(block: Block): Lift[] {
  if (!block.pick) return [];
  const parsed = block.pick.evidence.filter((e) => e.kind === "qloo-tag").map((e) => parseLift(e.label)).filter((x): x is Lift => x !== null);
  return parsed.length ? parsed : block.pick.topTags.map((tag) => ({ tag, lift: null }));
}

/** The plan's picks for the block picker, in rank order. */
export function faceOptions(data: PlanData): ListOption[] {
  const rank = new Map(data.plan.picks.map((p) => [p.faceId, p]));
  return data.faces
    .filter((f) => rank.has(f.id))
    .sort((x, y) => (rank.get(x.id)?.rank ?? 0) - (rank.get(y.id)?.rank ?? 0))
    .map((f) => {
      const p = rank.get(f.id);
      return {
        value: f.id,
        label: `${f.neighbourhood} · ${f.id}`,
        hint: `Pick ${p?.rank} · affinity ${p?.affinity.toFixed(2)} · ${f.name}`,
        keywords: `${f.kind} ${f.name}`,
      };
    });
}

/** How many times more concentrated the audience is around the hotter block; null when the colder one measures zero. */
export function concentration(a: Block, b: Block) {
  const hi = a.affinity >= b.affinity ? a : b;
  const lo = hi === a ? b : a;
  return { hi, lo, hotter: hi === a ? ("a" as const) : ("b" as const), ratio: lo.affinity > 0 ? hi.affinity / lo.affinity : null };
}

/** Tags both blocks over-index on. */
export function sharedTags(a: Block, b: Block): string[] {
  const bs = new Set(liftsFor(b).map((l) => l.tag.toLowerCase()));
  return liftsFor(a).filter((l) => bs.has(l.tag.toLowerCase())).map((l) => l.tag);
}
