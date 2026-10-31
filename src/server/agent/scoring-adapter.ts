import { NEIGHBOURHOOD_CAP, scoreFaces, splitBudget, type SplitResult } from "../scoring";
import type { ScoredFace, ScoringPort } from "./ports";

// Lane B1's scorer and optimizer as the pipeline's port.
// Units: affinity is 0..1 (heat around the face); score is 0..100 (affinity x visibility weight x 100); both come straight from scoreFaces.
//
// B1's optimizer caps a neighbourhood at 30% of the BRIEF BUDGET, so a plan that spends less than the budget can still put more than 30% of
// its SPEND in one neighbourhood. The plan promises 30% of spend: re-run the optimizer with the cap tightened to 30% of the spend it
// produced until no neighbourhood holds more than 30% of it.
type Split = (candidates: ScoredFace[], brief: { budgetUsd: number; flightWeeks: number }) => SplitResult;

export function splitCappedBySpend(candidates: ScoredFace[], brief: { budgetUsd: number; flightWeeks: number }, split: Split = (c, b) => splitBudget(c, b), cap = NEIGHBOURHOOD_CAP): SplitResult {
  let frac = cap;
  let result = split(candidates, brief);
  for (let i = 0; i < 8; i++) {
    const worst = Math.max(0, ...result.split.map((s) => s.share));
    if (worst <= cap + 1e-9 || result.spendUsd <= 0) break;
    const next = (cap * result.spendUsd) / brief.budgetUsd;
    if (next >= frac) break;
    frac = next;
    result = splitBudget(candidates, brief, { maxPerNeighbourhood: frac });
  }
  return result;
}

export function scoringPort(): ScoringPort {
  return { score: scoreFaces, split: (candidates, brief) => splitCappedBySpend(candidates, brief) };
}
