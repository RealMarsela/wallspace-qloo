import { NemoIngestRequest } from "@/contract";
import { jsonError, runtimeEnv, tokenFactoryFor } from "@/server/agent/env";
import { bearerOk } from "@/server/agent/http";
import { redraftFor } from "@/server/agent/redraft";
import { ingestNemo, nemoQueue } from "@/server/agent/signoff";
import { getStore } from "@/server/db";

// Bearer WALLSPACE_INGEST_SECRET. GET: lines waiting for NeMo. POST: the job's results.
export async function GET(request: Request) {
  const env = runtimeEnv();
  if (!bearerOk(request, env.WALLSPACE_INGEST_SECRET)) return jsonError("Unauthorized.", 401, "unauthorized");
  return Response.json({ items: await nemoQueue(await getStore(env as never)) });
}

export async function POST(request: Request) {
  const env = runtimeEnv();
  if (!bearerOk(request, env.WALLSPACE_INGEST_SECRET)) return jsonError("Unauthorized.", 401, "unauthorized");
  const parsed = NemoIngestRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid NeMo result payload.", 400, "bad_request");
  const store = await getStore(env as never);
  const tf = tokenFactoryFor(env);
  const out = await ingestNemo(store, parsed.data, tf ? redraftFor(store, tf) : undefined);
  return Response.json({ ok: true, ...out });
}
