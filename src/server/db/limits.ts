import type { z } from "zod";
import type { LimitsResponse } from "@/contract";
import type { Store } from "./types";

type Base = z.infer<typeof LimitsResponse>;
/** The contract's LimitsResponse plus additive fields: where the cost figure comes from, and the sample plan's own cost. */
export type Limits = Base & {
  costSource: { kind: "eval" | "runs" | "none"; label: string; runId: string | null; briefs: number };
  samplePlan: { planId: string; costUsd: number } | null;
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The public limits page, from what the app actually recorded: plans and runs in the store, and the metrics B2's workflows write
 * (guard.live, nemo.stats, qloo.coverage_gaps, plans.cost, eval.latest). Nothing here is invented: an empty store gives zeros and nulls.
 */
export async function buildLimits(store: Store, now: Date = new Date()): Promise<Limits> {
  const [plans, runs, signoffs, guard, nemo, gaps, cost, evalLatest] = await Promise.all([
    store.listPlans(500),
    store.listRuns({ kind: "plan", limit: 500 }),
    store.listSignoffs(),
    store.getMetric<Record<string, unknown>>("guard.live"),
    store.getMetric<Record<string, unknown>>("nemo.stats"),
    store.getMetric<string[]>("qloo.coverage_gaps"),
    store.getMetric<Record<string, unknown>>("plans.cost"),
    store.getMetric<Record<string, unknown>>("eval.latest"),
  ]);
  const live = plans.filter((p) => !p.sample);
  const done = runs.filter((r) => r.status === "done" && !plans.find((p) => p.runId === r.id)?.sample);
  const runCost = done.length ? done.reduce((a, r) => a + r.costUsd, 0) / done.length : null;
  const liveBlocked = signoffs.filter((s) => s.engine === "live-guard" && s.status === "blocked").length;
  // Cost per plan: the latest eval run's average over its briefs when there is one (a measured sample of ten, not one demo plan);
  // otherwise the average of finished live runs. The sample plan's own cost is reported separately.
  const evalPlans = num(cost?.value.plans);
  const evalCost = num(cost?.value.costPerPlanUsd);
  const evalRunId = typeof evalLatest?.value.runId === "string" ? evalLatest.value.runId : null;
  const fromEval = evalCost !== null && evalPlans !== null && evalPlans > 0;
  const costSource: Limits["costSource"] = fromEval
    ? { kind: "eval", label: `eval run ${evalRunId ?? "latest"}, ${evalPlans} briefs`, runId: evalRunId, briefs: evalPlans }
    : runCost !== null ? { kind: "runs", label: `${done.length} finished live ${done.length === 1 ? "run" : "runs"}`, runId: null, briefs: done.length }
    : { kind: "none", label: "no plan has been run yet", runId: null, briefs: 0 };
  const samplePlan = plans.find((p) => p.sample) ?? null;
  const sampleRun = samplePlan ? await store.getRun(samplePlan.runId) : null;
  const notes = [
    `Cost per plan is the average over ${costSource.label}; the sample plan's own cost is shown apart.`,
    "Faces are real OpenStreetMap billboards inside Atlanta plus sample faces; sizes, rates and owners are sample values.",
    "Taste by place comes from Qloo; it never describes a person, only what a block over-indexes on.",
    "The NeMo Guardrails job runs on Nebius, started from the CLI on demand; its numbers appear here after it reports back.",
  ];
  return {
    updatedAt: now.toISOString(),
    plans: fromEval ? evalPlans : live.length || plans.length,
    costPerPlanUsd: Math.round((fromEval ? evalCost : runCost ?? 0) * 10000) / 10000,
    facesDroppedForEvidence: fromEval ? num(cost?.value.facesDroppedForEvidence) ?? 0 : plans.reduce((a, p) => a + p.droppedCount, 0),
    guard: {
      live: { blocked: num(guard?.value.blocked) ?? liveBlocked, falsePositives: num(guard?.value.falsePositives) },
      nemo: { catchRate: num(nemo?.value.catchRate), falsePositiveRate: num(nemo?.value.falsePositiveRate), jobId: typeof nemo?.value.jobId === "string" ? nemo.value.jobId : null },
    },
    qlooCoverageGaps: Array.isArray(gaps?.value) ? gaps.value.filter((g): g is string => typeof g === "string") : [],
    notes,
    costSource,
    samplePlan: samplePlan ? { planId: samplePlan.id, costUsd: Math.round((sampleRun?.costUsd ?? 0) * 10000) / 10000 } : null,
  };
}
