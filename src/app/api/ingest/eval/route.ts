import { jsonError, runtimeEnv } from "@/server/agent/env";
import { bearerOk, newId } from "@/server/agent/http";
import { directRunner } from "@/server/agent/steps";
import { executeEval } from "@/server/workflows/eval-core";

// Bearer WALLSPACE_INGEST_SECRET. Starts the eval Workflow on demand (about ten live plans: costs real Token Factory credit).
export async function POST(request: Request) {
  const env = runtimeEnv();
  if (!bearerOk(request, env.WALLSPACE_INGEST_SECRET)) return jsonError("Unauthorized.", 401, "unauthorized");
  const params = { runId: newId("eval"), at: new Date().toISOString() };
  if (env.EVAL_RUN) await env.EVAL_RUN.create({ id: params.runId, params });
  else void executeEval(env, params, directRunner).catch(() => undefined);
  return Response.json({ runId: params.runId }, { status: 202 });
}
