import { describe, expect, it } from "vitest";
import { LimitsResponse, type Plan } from "@/contract";
import { buildLimits } from "./limits";
import { MemoryStore } from "./memory";

const plan = (id: string, sample: boolean, dropped = 0): Plan => ({
  id, briefId: "b", runId: `run-${id}`, status: "ready", picks: [], scoredCount: 86, droppedCount: dropped, spendUsd: 1000, split: [], heat: [],
  nemoJobId: null, lastRescanAt: null, createdAt: "2026-10-30T08:00:00.000Z", sample,
});

describe("buildLimits", () => {
  it("is honest on an empty store", async () => {
    const l = await buildLimits(new MemoryStore());
    expect(LimitsResponse.safeParse(l).success).toBe(true);
    expect(l).toMatchObject({ plans: 0, costPerPlanUsd: 0, costSource: { kind: "none" }, samplePlan: null });
  });
  it("uses the latest eval run for cost and plan count, labels it, and keeps the sample plan's cost apart", async () => {
    const s = new MemoryStore();
    await s.putPlan(plan("plan-sample", true, 23));
    await s.putRun({ id: "run-plan-sample", planId: "plan-sample", kind: "plan", status: "done", costUsd: 0.0192, startedAt: "2026-10-30T08:00:00.000Z", endedAt: null });
    await s.setMetric("plans.cost", { costPerPlanUsd: 0.0171, plans: 10, facesDroppedForEvidence: 230 });
    await s.setMetric("eval.latest", { runId: "run-eval-1" });
    const l = await buildLimits(s);
    expect(l).toMatchObject({ plans: 10, costPerPlanUsd: 0.0171, facesDroppedForEvidence: 230 });
    expect(l.costSource).toEqual({ kind: "eval", label: "eval run run-eval-1, 10 briefs", runId: "run-eval-1", briefs: 10 });
    expect(l.samplePlan).toEqual({ planId: "plan-sample", costUsd: 0.0192 });
    expect(l.notes[0]).toContain("eval run run-eval-1, 10 briefs");
  });
  it("falls back to finished live runs, excluding the sample plan's run", async () => {
    const s = new MemoryStore();
    await s.putPlan(plan("plan-sample", true));
    await s.putPlan(plan("live-1", false, 2));
    await s.putRun({ id: "run-plan-sample", planId: "plan-sample", kind: "plan", status: "done", costUsd: 0.5, startedAt: "2026-10-30T08:00:00.000Z", endedAt: null });
    await s.putRun({ id: "run-live-1", planId: "live-1", kind: "plan", status: "done", costUsd: 0.02, startedAt: "2026-10-30T09:00:00.000Z", endedAt: null });
    const l = await buildLimits(s);
    expect(l).toMatchObject({ plans: 1, costPerPlanUsd: 0.02, costSource: { kind: "runs", briefs: 1 } });
  });
});
