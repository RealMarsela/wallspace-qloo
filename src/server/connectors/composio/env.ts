// Runtime bindings the comms connectors read. Worker secrets and D1 come from the OpenNext Cloudflare context;
// outside the Worker (next dev, vitest) process.env and an in-memory store stand in.

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
export interface D1Like {
  prepare(sql: string): D1Stmt;
}

export interface ConnectorEnv {
  DB?: D1Like; // the WS_DB binding (D1) in wrangler.jsonc
  COMPOSIO_API_KEY?: string;
  WALLSPACE_COMPOSIO_WEBHOOK_SECRET?: string;
  WALLSPACE_SLACK_BOT_TOKEN?: string;
  WALLSPACE_SLACK_SIGNING_SECRET?: string;
  WALLSPACE_SLACK_CHANNEL?: string; // default channel id for approvals
  NEBIUS_API_KEY?: string;
  TF_MODE?: string;
  APP_URL?: string; // public base, default https://wallspace.pages.dev
}

export const DEFAULT_APP_URL = "https://wallspace.pages.dev";

const KEYS: (keyof ConnectorEnv)[] = [
  "COMPOSIO_API_KEY", "WALLSPACE_COMPOSIO_WEBHOOK_SECRET", "WALLSPACE_SLACK_BOT_TOKEN", "WALLSPACE_SLACK_SIGNING_SECRET",
  "WALLSPACE_SLACK_CHANNEL", "NEBIUS_API_KEY", "TF_MODE", "APP_URL",
];

export interface RuntimeContext {
  env: ConnectorEnv;
  waitUntil: (p: Promise<unknown>) => void;
}

// Resolves bindings lazily so importing this module never touches the Cloudflare context at build time.
export async function getRuntime(): Promise<RuntimeContext> {
  const env: ConnectorEnv = {};
  let waitUntil: RuntimeContext["waitUntil"] = (p) => {
    void p.catch(() => undefined);
  };
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const cf = await getCloudflareContext({ async: true });
    const bindings = cf.env as unknown as Record<string, unknown>;
    const db = bindings.WS_DB ?? bindings.DB;
    if (db) env.DB = db as D1Like;
    for (const k of KEYS) if (typeof bindings[k] === "string") (env as Record<string, unknown>)[k] = bindings[k];
    if (cf.ctx?.waitUntil) waitUntil = (p) => cf.ctx.waitUntil(p);
  } catch {
    // not on Workers: fall through to process.env
  }
  for (const k of KEYS) {
    const v = process.env[k];
    if (env[k] === undefined && v) (env as Record<string, unknown>)[k] = v;
  }
  return { env, waitUntil };
}

export function appUrl(env: ConnectorEnv): string {
  return (env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}
