import type { Env } from "./env";

// Fixed-window counters per client IP. KV in production (eventually consistent, so a limit is approximate across locations);
// an isolate-local map when no KV is bound (`next dev`, tests).
export interface Limit {
  bucket: string;
  max: number;
  windowSec: number;
}
export const SIGN_UP_LIMIT: Limit = { bucket: "signup", max: 6, windowSec: 3600 };
export const SIGN_IN_LIMIT: Limit = { bucket: "signin", max: 12, windowSec: 900 };

const local = new Map<string, { n: number; until: number }>();

export function clientIp(request: Request): string {
  const h = request.headers;
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Counts this attempt; false when the caller is over the limit. */
export async function allow(env: Env, request: Request, limit: Limit): Promise<boolean> {
  const window = Math.floor(Date.now() / (limit.windowSec * 1000));
  const key = `rl:${limit.bucket}:${clientIp(request)}:${window}`;
  if (env.WS_KV) {
    const n = Number((await env.WS_KV.get(key).catch(() => null)) ?? 0);
    if (n >= limit.max) return false;
    await env.WS_KV.put(key, String(n + 1), { expirationTtl: Math.max(60, limit.windowSec) }).catch(() => undefined);
    return true;
  }
  const now = Date.now();
  const cur = local.get(key);
  if (cur && cur.until > now && cur.n >= limit.max) return false;
  local.set(key, { n: (cur?.n ?? 0) + 1, until: now + limit.windowSec * 1000 });
  return true;
}

export function resetLocalLimits(): void {
  local.clear();
}
