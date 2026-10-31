import type { RunStep } from "@/contract";
import type { Store } from "../db/types";
import type { B2Env } from "./env";
import type { StepSink } from "./ports";

// Each finished RunStep is stored (D1), recorded in the metered-call ledger when it called a provider, and pushed to the run room.
export function makeSink(env: B2Env, store: Store, ctx: { runId: string; planId: string }): StepSink {
  const room = env.RUN_ROOM ? env.RUN_ROOM.get(env.RUN_ROOM.idFromName(ctx.runId)) : null;
  return async (step: RunStep) => {
    await store.appendStep(ctx.runId, step);
    const provider = step.role === "tavily" ? "tavily" : step.model ? "token-factory" : null;
    if (provider) {
      await store.appendLedger({
        id: `${ctx.runId}:${step.id}`, at: step.at, provider, endpoint: step.model ?? step.tool ?? step.title, requestKey: step.requestId, cached: step.cached,
        mode: env.TF_MODE === "replay" ? "replay" : "live", status: step.status === "error" ? "error" : "ok", ms: step.ms, costUsd: step.costUsd, planId: ctx.planId, runId: ctx.runId, note: step.title,
      }).catch(() => undefined);
    }
    if (room) await room.fetch("https://run-room.internal/step", { method: "POST", body: JSON.stringify(step) }).catch(() => undefined);
  };
}

export async function finishRoom(env: B2Env, runId: string, status: "done" | "failed"): Promise<void> {
  if (!env.RUN_ROOM) return;
  await env.RUN_ROOM.get(env.RUN_ROOM.idFromName(runId)).fetch("https://run-room.internal/finish", { method: "POST", body: JSON.stringify({ status }) }).catch(() => undefined);
}
