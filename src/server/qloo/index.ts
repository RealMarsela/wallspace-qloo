import type { WallspaceEnv } from "../db/bindings";
import { getStore } from "../db";
import { QlooClient } from "./client";

export * from "./endpoints";
export { QlooClient, type QlooResult, type QlooSource } from "./client";
export { QlooError } from "./types";
export type { QlooMode } from "./types";
export { buildAudienceCard } from "./card";

/** Judging caps: the key's 50,000-a-month pool is shared with one other project; 6,000 total / 1,500 a day leaves it ample headroom. */
export const QLOO_CAPS = { total: 6000, day: 1500 };

/**
 * The Qloo client. Always live: a KV copy of an earlier live answer when there is one (14 days), else a call to Qloo counted by the
 * QLOO_METER Durable Object and written back to KV. Without QLOO_API_KEY every call fails with QlooError "no_key"; nothing is invented.
 */
export async function qlooClientFor(env: WallspaceEnv & Record<string, unknown>, context?: { planId?: string; runId?: string }): Promise<QlooClient> {
  const num = (v: string | undefined) => (v && Number(v) > 0 ? Number(v) : undefined);
  return new QlooClient({
    apiKey: env.QLOO_API_KEY, kv: env.WS_KV, meter: env.QLOO_METER,
    caps: { total: num(env.QLOO_CAP_TOTAL) ?? QLOO_CAPS.total, day: num(env.QLOO_CAP_DAY) ?? QLOO_CAPS.day },
    store: await getStore(env).catch(() => undefined), context,
  });
}
