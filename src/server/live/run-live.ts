import { getStore } from "../db";
import type { B2Env } from "../agent/env";
import { jsonError } from "../agent/env";
import { readableRun } from "../auth/access";
import { principalOf } from "../auth/session";

// GET /api/runs/:id/live. A WebSocket upgrade cannot pass through a Next route handler, so worker/index.ts calls this first
// for any request whose path matches runLivePath. Without an upgrade it answers a JSON snapshot (same steps, for polling).
export const runLivePath = /^\/api\/runs\/([^/]+)\/live\/?$/;

export async function handleRunLive(request: Request, env: B2Env): Promise<Response | null> {
  const m = runLivePath.exec(new URL(request.url).pathname);
  if (!m || request.method !== "GET") return null;
  const runId = decodeURIComponent(m[1]);
  // A run follows its plan: the public sample's or the viewer's own. Anything else is not found, WebSocket or not.
  const viewer = await principalOf(request, env as never).catch(() => null);
  if (!(await readableRun(await getStore(env as never), runId, viewer?.workspace?.id ?? null).then(() => true, () => false))) {
    return jsonError("Run not found.", 404, "not_found");
  }
  const upgrade = request.headers.get("Upgrade") === "websocket";
  if (env.RUN_ROOM) {
    const stub = env.RUN_ROOM.get(env.RUN_ROOM.idFromName(runId));
    if (upgrade) return stub.fetch(request);
    const snap = await stub.fetch("https://run-room.internal/steps");
    const body = (await snap.json()) as { status: string; steps: unknown[] };
    if (body.steps.length) return Response.json(body);
  }
  if (upgrade) return jsonError("Live updates are not available here; poll GET /api/runs/:id.", 501, "no_run_room");
  const run = await (await getStore(env as never)).getRun(runId);
  if (!run) return jsonError("Run not found.", 404, "not_found");
  return Response.json({ status: run.status, steps: run.steps });
}
