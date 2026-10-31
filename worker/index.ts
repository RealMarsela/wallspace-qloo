/* eslint-disable @typescript-eslint/ban-ts-comment -- the OpenNext worker exists only after `opennextjs-cloudflare build` */
/**
 * Worker entry (wrangler `main`): OpenNext's generated worker, untouched, plus what OpenNext cannot emit:
 * the Durable Object and Workflow classes bound in wrangler.jsonc and the nightly cron handler.
 * Build order: `opennextjs-cloudflare build` writes .open-next/worker.js, then wrangler bundles this file.
 * Shared file: other lanes add their export line here with a minimal diff (B2's classes arrive through ./b2-classes).
 */
// @ts-ignore: .open-next/worker.js exists only after the OpenNext build.
import openNext from "../.open-next/worker.js";
// @ts-ignore: OpenNext's own Durable Objects, re-exported so wrangler can find them if they are ever bound.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";
export { QlooMeter } from "./qloo-meter";
export { RunRoom, TavilyBudget, PlanRun, Rescan, EvalRun } from "./b2-classes";
import type { B2Env } from "../src/server/agent/env";
import { handleRunLive, runLivePath } from "../src/server/live/run-live";

interface Env {
  RESCAN?: { create(opts: { id?: string; params?: unknown }): Promise<{ id: string }> };
  APP_URL?: string;
}
interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

type Fetcher = { fetch(r: Request, e: unknown, c: Ctx): Promise<Response> };
const app = (): Fetcher => openNext as Fetcher;

const NIGHTLY = "0 19 * * *";

/** Calls one of the app's own sync routes in-process (no network hop), the way a visitor's POST would arrive. */
async function post(path: string, env: Env, ctx: Ctx): Promise<void> {
  const origin = env.APP_URL ?? "https://wallspace.pages.dev";
  await app().fetch(new Request(`${origin}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env, ctx).catch(() => undefined);
}

const worker = {
  async fetch(request: Request, env: unknown, ctx: Ctx): Promise<Response> {
    // A WebSocket upgrade cannot pass through a Next route handler: B2's run-room handler answers /api/runs/:id/live first.
    if (runLivePath.test(new URL(request.url).pathname)) {
      const live = await handleRunLive(request, env as B2Env);
      if (live) return live;
    }
    return app().fetch(request, env, ctx);
  },

  /**
   * Two crons (wrangler.jsonc). "*\/10 * * * *": pull read-back from the customer's tools (mail replies, HubSpot/Sheets/Calendar changes),
   * because the Composio webhook is not available to this product. "0 19 * * *" (19:00 UTC = 03:00 Kuala Lumpur): the nightly re-scan
   * Workflow, plus the same polls.
   */
  async scheduled(controller: { scheduledTime: number; cron: string }, env: Env, ctx: Ctx): Promise<void> {
    const at = new Date(controller.scheduledTime).toISOString();
    if (controller.cron === NIGHTLY && env.RESCAN) {
      const runId = `run-rescan-${at.slice(0, 13).replace(/\D/g, "")}`;
      ctx.waitUntil(env.RESCAN.create({ id: runId, params: { runId, trigger: "cron", at } }).then(() => undefined, () => undefined));
    }
    ctx.waitUntil(Promise.all([post("/api/connectors/mail/sync", env, ctx), post("/api/connectors/records/sync", env, ctx)]));
  },
};

export default worker;
