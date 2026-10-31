import { getCloudflareContext } from "@opennextjs/cloudflare";
import { TokenFactory, tfOptionsFromEnv, type ReplayStore, type TfEnv } from "../models";

import type { WallspaceEnv } from "../db/bindings";

export type { D1Like, KvLike, DurableNsLike, WorkflowBinding } from "../db/bindings";

// B1's WallspaceEnv (WS_DB, WS_KV, RUN_ROOM, TAVILY_BUDGET, PLAN_RUN, RESCAN, EVAL_RUN, *_MODE) plus the secrets this lane reads.
export interface B2Env extends WallspaceEnv, TfEnv {
  NEBIUS_API_KEY?: string;
  TAVILY_API_KEY?: string;
  WALLSPACE_INGEST_SECRET?: string;
  PLAN_DAILY_CAP?: string;
}

// Cloudflare bindings when running on Workers, process.env under `next dev` and in scripts.
export function runtimeEnv(): B2Env & Record<string, unknown> {
  let bindings: Record<string, unknown> = {};
  try {
    bindings = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    // not on workerd: process.env only
  }
  return { ...(process.env as Record<string, unknown>), ...bindings } as B2Env & Record<string, unknown>;
}

export function tokenFactoryFor(env: B2Env, store?: ReplayStore): TokenFactory | null {
  const opts = tfOptionsFromEnv(env, { store });
  if (opts.mode === "live" && !opts.apiKey) return null;
  return new TokenFactory(opts);
}

export function jsonError(error: string, status: number, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status });
}
