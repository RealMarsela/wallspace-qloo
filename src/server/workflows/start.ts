import type { Brief } from "@/contract";
import type { B2Env } from "../agent/env";
import { getStore } from "../db";
import { directRunner } from "../agent/steps";
import { executePlanRun, placeholderPlan, type PlanRunParams } from "./plan-run-core";
import { newId } from "../agent/http";

// Visitors may start a few live runs a day; the demo's sample plan is made by the builder, never through this path.
export const PER_SESSION_DAILY = 3;
export const DEFAULT_DAILY_CAP = 10;

export async function claimRunSlot(env: B2Env, sessionId: string): Promise<{ ok: true } | { ok: false; reason: "session_cap" | "daily_cap" }> {
  const store = await getStore(env as never);
  const key = `plans.day:${new Date().toISOString().slice(0, 10)}`;
  const cur = (await store.getMetric<{ total: number; sessions: Record<string, number> }>(key))?.value ?? { total: 0, sessions: {} };
  const cap = Number(env.PLAN_DAILY_CAP ?? DEFAULT_DAILY_CAP);
  if (cur.total >= cap) return { ok: false, reason: "daily_cap" };
  if ((cur.sessions[sessionId] ?? 0) >= PER_SESSION_DAILY) return { ok: false, reason: "session_cap" };
  await store.setMetric(key, { total: cur.total + 1, sessions: { ...cur.sessions, [sessionId]: (cur.sessions[sessionId] ?? 0) + 1 } });
  return { ok: true };
}

// Creates the running plan and run, then starts the Workflow (or runs inline when no Workflow binding exists, i.e. `next dev`).
export async function startPlan(env: B2Env, brief: Brief, sessionId: string, opts: { sample?: boolean; bucket?: "visitor" | "prewarm"; workspaceId?: string } = {}): Promise<{ planId: string; runId: string }> {
  const store = await getStore(env as never);
  const params: PlanRunParams = { planId: newId("plan"), runId: newId("run"), briefId: brief.id, sessionId, sample: opts.sample, bucket: opts.bucket, createdAt: new Date().toISOString() };
  await store.putPlan(placeholderPlan(params, brief));
  if (opts.workspaceId) await store.assignOwner("plan", params.planId, opts.workspaceId);
  await store.putRun({ id: params.runId, planId: params.planId, kind: "plan", status: "running", costUsd: 0, startedAt: params.createdAt, endedAt: null });
  if (env.PLAN_RUN) await env.PLAN_RUN.create({ id: params.runId, params });
  else void executePlanRun(env, params, directRunner).catch(() => undefined);
  return { planId: params.planId, runId: params.runId };
}
