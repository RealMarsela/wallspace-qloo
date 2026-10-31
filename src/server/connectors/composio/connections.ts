import type { Connection } from "@/contract";
import { ComposioClient, type ConnectedAccount } from "./client";
import { appUrl, getRuntime, type RuntimeContext } from "./env";
import { HttpError } from "./http";
import { getProvider, listProviders, type ProviderCtx, type ProviderDef } from "./registry";
import { getStore } from "./store";
import { scopeStore } from "./scoped-store";
import "./boot";

// Origin used for OAuth callbacks and plan links: the public app URL, except on localhost where the request origin wins.
export function originFor(req: Request, rt: RuntimeContext): string {
  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  return appUrl(rt.env);
}

// userId is the workspace's Composio user id (the demo workspace's is "wallspace-demo"). The store is bound to it.
export async function buildCtx(req: Request, userId: string): Promise<ProviderCtx> {
  const rt = await getRuntime();
  return {
    rt, store: scopeStore(getStore(rt.env), userId), userId,
    composio: new ComposioClient({ apiKey: rt.env.COMPOSIO_API_KEY }),
    origin: originFor(req, rt),
  };
}

const RANK: Record<string, number> = { ACTIVE: 3, INITIATED: 2, EXPIRED: 1 };

function bestByToolkit(rows: ConnectedAccount[]): Map<string, ConnectedAccount> {
  const best = new Map<string, ConnectedAccount>();
  for (const r of rows) {
    const cur = best.get(r.toolkit);
    const better = !cur || (RANK[r.status] ?? 0) > (RANK[cur.status] ?? 0) || ((RANK[r.status] ?? 0) === (RANK[cur.status] ?? 0) && (r.updatedAt ?? "") > (cur.updatedAt ?? ""));
    if (better) best.set(r.toolkit, r);
  }
  return best;
}

async function oneConnection(ctx: ProviderCtx, def: ProviderDef, accounts: Map<string, ConnectedAccount> | null): Promise<Connection> {
  let status: Connection["status"] = "not-connected";
  let account: string | null = null;
  if (def.status) {
    ({ status, account } = await def.status(ctx));
  } else if (def.toolkit) {
    if (accounts === null) status = "error";
    else {
      const a = accounts.get(def.toolkit);
      if (a?.status === "ACTIVE") {
        status = "connected";
        account = a.label ?? (await ctx.store.getAccount(def.id).catch(() => null))?.label ?? null;
        await ctx.store.upsertAccount({ provider: def.id, composioAccountId: a.id, userId: ctx.userId, label: account, status: "ACTIVE" }).catch(() => undefined);
      } else if (a && (a.status === "EXPIRED" || a.status === "FAILED")) status = "error";
    }
  }
  // The event log is secondary: a missing migration must not hide the provider's connection status.
  const [events, lastSyncAt] = await Promise.all([
    ctx.store.listEvents({ provider: def.id, limit: 5 }).catch(() => []),
    ctx.store.lastEventAt(def.id).catch(() => null),
  ]);
  return {
    provider: def.id, category: def.category, name: def.name, status, account, realtime: def.realtime, lastSyncAt,
    events: events.map((e) => ({ at: e.at, direction: e.direction, summary: e.summary })),
  };
}

// GET /api/connections: every registered provider, status from Composio connected accounts or the provider's own check.
export async function listConnections(ctx: ProviderCtx): Promise<Connection[]> {
  let accounts: Map<string, ConnectedAccount> | null = null;
  try {
    accounts = bestByToolkit(await ctx.composio.listConnectedAccounts({ userId: ctx.userId }));
  } catch {
    accounts = null; // Composio unreachable or key missing: toolkit providers report "error"
  }
  return Promise.all(listProviders().map((d) => oneConnection(ctx, d, accounts)));
}

export function requireProvider(id: string): ProviderDef {
  const def = getProvider(id);
  if (!def) throw new HttpError(`unknown provider ${id}`, "unknown_provider", 404);
  return def;
}

export async function connectProvider(ctx: ProviderCtx, id: string): Promise<{ redirectUrl: string }> {
  const def = requireProvider(id);
  const callback = `${ctx.origin}/api/connectors/composio/callback?provider=${encodeURIComponent(id)}`;
  if (def.connect) return def.connect(ctx, callback);
  if (!def.toolkit) throw new HttpError(`${def.name} cannot be connected from here`, "not_connectable", 409);
  const link = await ctx.composio.connectLink(def.toolkit, ctx.userId, callback);
  return { redirectUrl: link.redirectUrl };
}

export async function disconnectProvider(ctx: ProviderCtx, id: string): Promise<void> {
  const def = requireProvider(id);
  if (def.disconnect) return def.disconnect(ctx);
  if (!def.toolkit) throw new HttpError(`${def.name} cannot be disconnected from here`, "not_connectable", 409);
  const rows = await ctx.composio.listConnectedAccounts({ userId: ctx.userId, toolkit: def.toolkit });
  for (const r of rows) await ctx.composio.deleteConnectedAccount(r.id);
  await ctx.store.deleteAccount(id);
  await ctx.store.recordEvent({ provider: id, planId: null, direction: "out", kind: "disconnected", summary: `${def.name} disconnected` });
}

// Called from the OAuth callback after the consent screen: records the connection when Composio shows it ACTIVE.
export async function confirmConnected(ctx: ProviderCtx, id: string): Promise<boolean> {
  const def = requireProvider(id);
  if (!def.toolkit) return false;
  const rows = await ctx.composio.listConnectedAccounts({ userId: ctx.userId, toolkit: def.toolkit });
  const a = bestByToolkit(rows).get(def.toolkit);
  if (a?.status !== "ACTIVE") return false;
  await ctx.store.upsertAccount({ provider: id, composioAccountId: a.id, userId: ctx.userId, label: a.label, status: "ACTIVE" });
  await ctx.store.recordEvent({ provider: id, planId: null, direction: "out", kind: "connected", summary: `${def.name} connected`, dedupeKey: `connected:${id}:${a.id}` });
  return true;
}
