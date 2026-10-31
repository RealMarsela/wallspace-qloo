import type { Brief, Face, Plan } from "@/contract";
import type { ScoredFace } from "./score";
import { visibilityWeight } from "./score";

// Budget optimizer: fit picks inside the budget, at most 30% of it in any one neighbourhood, a mix of kinds, ranked by value
// (affinity x visibility weight per dollar). Pure and deterministic.
export const NEIGHBOURHOOD_CAP = 0.3;
export const MAX_PICKS = 12;
export const KIND_CAP = 0.6; // no kind takes more than 60% of the picks, so the plan is not twelve bus shelters
export const AFFINITY_FLOOR = 0.35; // a pick must reach this share of the best affinity: cheap but off-taste faces do not fill the budget
const WEEKS_PER_MONTH = 4.345;

export function faceCost(f: Pick<Face, "rateMonthUsd">, weeks: number): number {
  return Math.round(f.rateMonthUsd * (weeks / WEEKS_PER_MONTH));
}

export interface SplitOptions { maxPerNeighbourhood?: number; maxPicks?: number; kindCap?: number; affinityFloor?: number }
export interface SplitResult { picks: ScoredFace[]; costs: Record<string, number>; split: Plan["split"]; spendUsd: number }

export function splitBudget(candidates: ScoredFace[], brief: Pick<Brief, "budgetUsd" | "flightWeeks">, o: SplitOptions = {}): SplitResult {
  const maxPicks = o.maxPicks ?? MAX_PICKS;
  const hoodCap = brief.budgetUsd * (o.maxPerNeighbourhood ?? NEIGHBOURHOOD_CAP);
  const kindMax = Math.max(1, Math.ceil(maxPicks * (o.kindCap ?? KIND_CAP)));
  const pool = candidates.filter((c) => c.hasEvidence && c.score > 0);
  const best = pool.reduce((m, c) => Math.max(m, c.affinity), 0);
  const floor = best * (o.affinityFloor ?? AFFINITY_FLOOR);
  const ranked = pool
    .filter((c) => c.affinity >= floor)
    .map((c) => ({ c, cost: faceCost(c.face, brief.flightWeeks) }))
    .filter((x) => x.cost > 0)
    .map((x) => ({ ...x, value: (x.c.affinity * visibilityWeight(x.c.face)) / x.cost }))
    .sort((a, b) => b.value - a.value || a.c.face.id.localeCompare(b.c.face.id));

  const hood = new Map<string, number>();
  const kinds = new Map<Face["kind"], number>();
  const picks: ScoredFace[] = [];
  const costs: Record<string, number> = {};
  let spend = 0;
  const take = (c: ScoredFace, cost: number): boolean => {
    const h = hood.get(c.face.neighbourhood) ?? 0;
    if (picks.length >= maxPicks || picks.includes(c) || spend + cost > brief.budgetUsd || h + cost > hoodCap || (kinds.get(c.face.kind) ?? 0) >= kindMax) return false;
    picks.push(c);
    costs[c.face.id] = cost;
    hood.set(c.face.neighbourhood, h + cost);
    kinds.set(c.face.kind, (kinds.get(c.face.kind) ?? 0) + 1);
    spend += cost;
    return true;
  };
  // Seed with the best-value large format of each kind (bulletin, digital bulletin) so value-per-dollar does not leave a plan of posters only.
  for (const kind of ["bulletin", "digital_bulletin"] as const) {
    for (const x of ranked.filter((r) => r.c.face.kind === kind)) if (take(x.c, x.cost)) break;
  }
  for (const { c, cost } of ranked) take(c, cost);
  picks.sort((a, b) => b.score - a.score || a.face.id.localeCompare(b.face.id));
  const split = [...hood.entries()]
    .map(([neighbourhood, usd]) => ({ neighbourhood, usd, share: spend ? Math.round((usd / spend) * 1000) / 1000 : 0 }))
    .sort((a, b) => b.usd - a.usd);
  return { picks, costs, split, spendUsd: spend };
}
