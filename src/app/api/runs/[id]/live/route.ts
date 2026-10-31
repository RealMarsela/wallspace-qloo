import { jsonError, runtimeEnv } from "@/server/agent/env";
import { handleRunLive } from "@/server/live/run-live";

// WebSocket upgrades are answered by worker/index.ts before Next sees them (handleRunLive). This route serves the JSON snapshot
// for polling and the 501 for an upgrade that reached Next (plain `next dev`).
export async function GET(request: Request) {
  return (await handleRunLive(request, runtimeEnv())) ?? jsonError("Run not found.", 404, "not_found");
}
