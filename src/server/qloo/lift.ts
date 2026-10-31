import type { QlooTag } from "./types";

// Tag affinities from Qloo's location-signal insights are popularity-like (nearly every row between 0.98 and 1.0) and their scale
// shifts from one query to the next, so the raw numbers can neither tell two blocks apart nor be compared with the city's. What does
// differ is where a tag RANKS around a point against where it ranks across the whole city. This module reports that gap.

/** Namespaces that describe people (who visits), not taste. Wallspace is taste only, so they never reach a card or a prompt. */
const IDENTITY_NAMESPACES = ["urn:tag:customer_identity:", "urn:tag:demographic", "urn:tag:audience"];
export const isIdentityTag = (t: Pick<QlooTag, "id" | "type">): boolean => IDENTITY_NAMESPACES.some((p) => (t.type ?? "").startsWith(p) || t.id.startsWith(p));

export interface LiftedTag {
  id: string;
  name: string;
  type: string | null;
  affinity: number; // Qloo's own number, 0..1
  /** City rank divided by block rank (taste rows only): 4 = ranks four times higher here than across Atlanta, 1 = no different. Null = no city list to compare with. */
  lift: number | null;
  blockRank: number; // 1-based position in the block list
  cityRank: number | null; // 1-based position in the city list; null = not among the city's listed rows
  distinctive: boolean; // absent from the city list, so `lift` is a lower bound (it assumes the city rank is just past the list)
}

const taste = (rows: QlooTag[]) => rows.filter((t) => t.name && !isIdentityTag(t) && typeof t.affinity === "number");

/**
 * Lift of each block tag against the city list, both lists in Qloo's order with identity-style namespaces removed.
 * A tag missing from the city list is given the rank just past the end of it. Sorted by lift, then by block rank.
 */
export function liftAgainstCity(block: QlooTag[], city: QlooTag[]): LiftedTag[] {
  const cityRows = taste(city);
  const cityRank = new Map(cityRows.map((t, i) => [t.id, i + 1] as const));
  return taste(block)
    .map((t, i): LiftedTag => {
      const cr = cityRank.get(t.id) ?? null;
      const rank = i + 1;
      return {
        id: t.id, name: t.name, type: t.type, affinity: t.affinity as number,
        lift: Math.round(((cr ?? cityRows.length + 1) / rank) * 10) / 10, blockRank: rank, cityRank: cr, distinctive: cr === null,
      };
    })
    .sort((x, y) => (y.lift ?? 0) - (x.lift ?? 0) || x.blockRank - y.blockRank);
}

/**
 * The rows a card or a plan shows for one block. With a city list: ranked by lift. Without one (the baseline call failed): Qloo's order, no lift.
 */
export function rankTags(block: QlooTag[], city: QlooTag[] | null, take = 12): LiftedTag[] {
  if (city) return liftAgainstCity(block, city).slice(0, take);
  return taste(block).slice(0, take).map((t, i) => ({ id: t.id, name: t.name, type: t.type, affinity: t.affinity as number, lift: null, blockRank: i + 1, cityRank: null, distinctive: false }));
}

/** 0..1 score for a row: lift/(lift+1) when there is a lift, else Qloo's own affinity. */
export const tagScore = (t: LiftedTag): number => (t.lift === null ? Math.round(t.affinity * 1000) / 1000 : Math.round((t.lift / (t.lift + 1)) * 1000) / 1000);

/** Real Qloo affinities crowd just under 1 (0.9998 vs 0.9979), so show the count of nines: -log10(1 - a) / 4, capped at 1. */
export const ninesScore = (a: number | null): number => (typeof a === "number" ? Math.round(Math.min(1, -Math.log10(Math.max(1e-6, 1 - a)) / 4) * 100) / 100 : 0);
