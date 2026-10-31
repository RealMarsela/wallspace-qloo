import type { Brief, Plan } from "@/contract";
import { buildDeps } from "../agent/deps";
import type { B2Env } from "../agent/env";
import { getStore } from "../db";
import { finishRoom } from "../agent/sink";
import { runPlanPipeline } from "../agent/pipeline";
import { PlanError, codeStep, emitSteps, type StepRunner } from "../agent/steps";
import { makeSink } from "../agent/sink";

export interface PlanRunParams {
  planId: string;
  runId: string;
  briefId: string;
  sessionId: string;
  sample?: boolean;
  createdAt: string;
  bucket?: "visitor" | "prewarm";
}

// The empty plan a visitor lands on while the run is going; the pipeline replaces it when it finishes.
export function placeholderPlan(p: Pick<PlanRunParams, "planId" | "runId" | "createdAt" | "sample">, brief: Brief): Plan {
  return { id: p.planId, briefId: brief.id, runId: p.runId, status: "running", picks: [], scoredCount: 0, droppedCount: 0, spendUsd: 0, split: [], heat: [], nemoJobId: null, lastRescanAt: null, createdAt: p.createdAt, sample: !!p.sample };
}

export async function executePlanRun(env: B2Env, p: PlanRunParams, step: StepRunner): Promise<{ planId: string; status: "ready" | "failed"; error?: string }> {
  const store = await getStore(env as never);
  const brief = await store.getBrief(p.briefId);
  if (!brief) return { planId: p.planId, status: "failed", error: "brief not found" };
  const head = { id: p.runId, planId: p.planId, kind: "plan" as const, costUsd: 0, startedAt: p.createdAt, endedAt: null };
  await store.putRun({ ...head, status: "running" });
  try {
    const deps = await buildDeps(env, { runId: p.runId, planId: p.planId, sessionId: p.sessionId, bucket: p.bucket, step });
    await runPlanPipeline(deps, { brief, planId: p.planId, runId: p.runId, sample: !!p.sample });
    await finishRoom(env, p.runId, "done");
    return { planId: p.planId, status: "ready" };
  } catch (e) {
    const message = e instanceof PlanError ? e.message : "The run failed. Try again in a minute.";
    // The reason goes on the run panel (our own error text only: never a provider body, key or stack).
    const detail = e instanceof Error ? `${e.name}${(e as { code?: string }).code ? ` ${(e as { code?: string }).code}` : ""}: ${e.message}`.slice(0, 240) : "unknown error";
    await emitSteps(makeSink(env, store, { runId: p.runId, planId: p.planId }), `${p.runId}:failed`, [codeStep("super-vl", "run stopped", "pipeline", detail, 0, "error")]).catch(() => undefined);
    const run = await store.getRun(p.runId);
    await store.putPlan({ ...placeholderPlan(p, brief), status: "failed" });
    await store.putRun({ ...head, status: "failed", costUsd: run?.steps.reduce((a, s) => a + (s.costUsd ?? 0), 0) ?? 0, endedAt: new Date().toISOString() });
    await finishRoom(env, p.runId, "failed");
    return { planId: p.planId, status: "failed", error: message };
  }
}
