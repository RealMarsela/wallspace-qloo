import { DEMO_USER_ID } from "@/contract/connectors-comms";
import { getStore } from "../composio/store";
import { scopeStore } from "../composio/scoped-store";
import type { ProviderCtx } from "../composio/registry";
import type { ThreadRow } from "../composio/store";
import { syncThreads, type SyncResult } from "./sync";

// Cron read-back for every workspace: each recent mail thread is polled with the Composio user of the workspace that sent it.
export async function syncRecentRepliesAllWorkspaces(base: ProviderCtx, hours = 72): Promise<SyncResult> {
  const raw = getStore(base.rt.env);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const threads = (await Promise.all([raw.openThreads("gmail", since), raw.openThreads("outlook", since)])).flat();
  const byUser = new Map<string, ThreadRow[]>();
  for (const t of threads) byUser.set(t.userId ?? DEMO_USER_ID, [...(byUser.get(t.userId ?? DEMO_USER_ID) ?? []), t]);
  const total: SyncResult = { checked: 0, newReplies: 0, errors: [] };
  for (const [userId, list] of byUser) {
    const r = await syncThreads({ ...base, userId, store: scopeStore(raw, userId) }, list);
    total.checked += r.checked;
    total.newReplies += r.newReplies;
    total.errors.push(...r.errors);
  }
  return total;
}
