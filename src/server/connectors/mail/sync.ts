import { TOOLS } from "@/contract/connectors-comms";
import { activeAccount } from "../composio/accounts";
import type { ProviderCtx } from "../composio/registry";
import type { ThreadRow } from "../composio/store";
import { messagesOf, normalizeGmail, normalizeOutlook } from "./normalize";
import { ingestReply, looksLikeReply } from "./replies";

// Pull-side reply sync. Works with no webhook (the Composio project webhook is shared, see handback): reads the
// plan's Gmail thread or Outlook messages carrying the [WS:plan] token and ingests new replies. Safe to call
// repeatedly; ingestReply dedupes by provider message id.

export interface SyncResult {
  checked: number;
  newReplies: number;
  errors: string[];
}

async function syncThread(ctx: ProviderCtx, t: ThreadRow, accountId: string): Promise<number> {
  let fresh = 0;
  if (t.provider === "gmail") {
    if (!t.threadId) return 0;
    const out = await ctx.composio.executeTool(TOOLS.gmailThread, accountId, ctx.userId, { thread_id: t.threadId, user_id: "me" });
    for (const raw of messagesOf(out.data)) {
      const m = normalizeGmail(raw);
      if (!m || !looksLikeReply(m, t)) continue;
      if (m.receivedAt < t.sentAt) continue;
      const r = await ingestReply(ctx, { provider: "gmail", planId: t.planId, ...m });
      if (r.inserted) fresh++;
    }
  } else {
    const out = await ctx.composio.executeTool(TOOLS.outlookList, accountId, ctx.userId, {
      subject_contains: t.token, folder: "inbox", received_date_time_ge: t.sentAt, top: 10, response_detail: "full",
    });
    for (const raw of messagesOf(out.data)) {
      const m = normalizeOutlook(raw);
      if (!m || !looksLikeReply(m, t)) continue;
      const r = await ingestReply(ctx, { provider: "outlook", planId: t.planId, ...m });
      if (r.inserted) fresh++;
    }
  }
  await ctx.store.touchThread(t.id, new Date().toISOString());
  return fresh;
}

// Remembers for 30 s that a provider had no active account, so repeated polls with nothing connected cost no Composio call.
const noAccountUntil = new Map<string, number>();

export function resetSyncCache(): void {
  noAccountUntil.clear();
}

export async function syncThreads(ctx: ProviderCtx, threads: ThreadRow[]): Promise<SyncResult> {
  const res: SyncResult = { checked: 0, newReplies: 0, errors: [] };
  if (threads.length === 0 || !ctx.rt.env.COMPOSIO_API_KEY) return res;
  const accounts = new Map<string, string | null>();
  for (const t of threads) {
    if (t.provider !== "gmail" && t.provider !== "outlook") continue;
    if (!accounts.has(t.provider)) {
      if ((noAccountUntil.get(`${ctx.userId}:${t.provider}`) ?? 0) > Date.now()) accounts.set(t.provider, null);
      else {
        const found = (await activeAccount(ctx, t.provider).catch(() => null))?.id ?? null;
        if (!found) noAccountUntil.set(`${ctx.userId}:${t.provider}`, Date.now() + 30_000);
        accounts.set(t.provider, found);
      }
    }
    const accountId = accounts.get(t.provider);
    if (!accountId) {
      res.errors.push(`${t.provider} is not connected`);
      continue;
    }
    // Throttle: the plan page polls while open; do not hit Composio more than once per 10 s per thread.
    if (t.lastCheckedAt && Date.now() - Date.parse(t.lastCheckedAt) < 10_000) continue;
    res.checked++;
    try {
      res.newReplies += await syncThread(ctx, t, accountId);
    } catch (e) {
      res.errors.push(`${t.provider}: ${e instanceof Error ? e.message : "sync failed"}`.slice(0, 200));
    }
  }
  return res;
}

export async function syncPlanReplies(ctx: ProviderCtx, planId: string): Promise<SyncResult> {
  const threads = await ctx.store.threadsForPlan(planId);
  return syncThreads(ctx, threads.filter((t) => t.provider === "gmail" || t.provider === "outlook"));
}

// For the cron trigger: every mail thread sent in the last `hours`.
export async function syncRecentReplies(ctx: ProviderCtx, hours = 72): Promise<SyncResult> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const [g, o] = await Promise.all([ctx.store.openThreads("gmail", since), ctx.store.openThreads("outlook", since)]);
  return syncThreads(ctx, [...g, ...o]);
}
