import { budgetClientFromStub } from "../tavily/budget-core";
import { Tavily } from "../tavily/client";
import { getStore } from "../db";
import { loadAdapters } from "./adapters";
import type { B2Env } from "./env";
import { tokenFactoryFor } from "./env";
import { MemoryKv } from "./memory";
import type { KvMin } from "./ports";
import type { PipelineDeps } from "./pipeline";
import { makeSink } from "./sink";
import { directRunner, PlanError, type StepRunner } from "./steps";

export interface DepsContext {
  runId: string;
  planId: string;
  sessionId: string;
  bucket?: "visitor" | "prewarm";
  step?: StepRunner;
}

export function kvFor(env: B2Env): KvMin {
  return (env.WS_KV as KvMin | undefined) ?? new MemoryKv();
}

export function tavilyFor(env: B2Env): Tavily | null {
  if (env.TAVILY_MODE === "replay" || !env.TAVILY_API_KEY) return null;
  return new Tavily({ mode: "live", apiKey: env.TAVILY_API_KEY });
}

export async function buildDeps(env: B2Env, ctx: DepsContext): Promise<PipelineDeps> {
  const tf = tokenFactoryFor(env);
  if (!tf) throw new PlanError("Token Factory key is not configured", "no_key");
  const store = await getStore(env as never);
  const a = await loadAdapters(env, { planId: ctx.planId, runId: ctx.runId });
  return {
    tf, qloo: a.qloo, scoring: a.scoring, faces: a.faces, kv: kvFor(env), tavily: tavilyFor(env),
    budget: env.TAVILY_BUDGET ? budgetClientFromStub(env.TAVILY_BUDGET.get(env.TAVILY_BUDGET.idFromName("global"))) : null,
    store, emit: makeSink(env, store, ctx), step: ctx.step ?? directRunner, sessionId: ctx.sessionId, bucket: ctx.bucket ?? "visitor",
  };
}
