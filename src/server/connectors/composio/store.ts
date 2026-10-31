import { DEMO_USER_ID, type ConnectorEvent, type EventKind } from "@/contract/connectors-comms";
import { D1Store } from "./d1-store";
import type { ConnectorEnv } from "./env";

export interface AccountRow {
  provider: string;
  composioAccountId: string | null;
  userId: string;
  label: string | null;
  status: string;
  updatedAt: string;
}

export interface ThreadRow {
  id: string;
  planId: string;
  provider: string;
  threadId: string | null;
  messageId: string | null;
  token: string; // subject token or Slack channel/ts marker
  recipient: string | null;
  sentAt: string;
  lastCheckedAt: string | null;
  userId?: string | null; // Composio user id of the workspace that sent it; null on rows from before workspaces
}

export interface NewEvent {
  provider: string;
  planId: string | null;
  direction: "out" | "in";
  kind: EventKind;
  summary: string;
  detail?: Record<string, unknown> | null;
  dedupeKey?: string | null;
  at?: string;
  userId?: string | null; // the workspace's Composio user id; scopes provider-level events (no plan) to one workspace
}

export interface CommsStore {
  upsertAccount(a: Omit<AccountRow, "updatedAt"> & { updatedAt?: string }): Promise<void>;
  // Accounts are keyed by (userId, provider); userId defaults to the demo workspace's Composio user.
  getAccount(provider: string, userId?: string): Promise<AccountRow | null>;
  deleteAccount(provider: string, userId?: string): Promise<void>;
  recordEvent(e: NewEvent): Promise<{ inserted: boolean; id: string }>;
  listEvents(q: { planId?: string; provider?: string; limit: number; userId?: string }): Promise<ConnectorEvent[]>;
  hasDedupe(key: string): Promise<boolean>;
  lastEventAt(provider: string, userId?: string): Promise<string | null>;
  saveThread(t: Omit<ThreadRow, "id" | "lastCheckedAt">): Promise<ThreadRow>;
  threadsForPlan(planId: string, provider?: string, userId?: string): Promise<ThreadRow[]>;
  openThreads(provider: string, sinceIso: string, userId?: string): Promise<ThreadRow[]>;
  findThread(provider: string, threadId: string): Promise<ThreadRow | null>;
  touchThread(id: string, at: string): Promise<void>;
  markWebhookSeen(id: string): Promise<boolean>; // true when first seen
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// Dev and test fallback when no D1 binding exists. Lives for the isolate only.
export class MemoryStore implements CommsStore {
  private accounts = new Map<string, AccountRow>();
  private events: (ConnectorEvent & { dedupe: string | null; userId: string | null })[] = [];
  private threads: ThreadRow[] = [];
  private seen = new Set<string>();

  async upsertAccount(a: Omit<AccountRow, "updatedAt"> & { updatedAt?: string }) {
    this.accounts.set(`${a.userId}:${a.provider}`, { ...a, updatedAt: a.updatedAt ?? new Date().toISOString() });
  }
  async getAccount(provider: string, userId = DEMO_USER_ID) { return this.accounts.get(`${userId}:${provider}`) ?? null; }
  async deleteAccount(provider: string, userId = DEMO_USER_ID) { this.accounts.delete(`${userId}:${provider}`); }
  async recordEvent(e: NewEvent) {
    if (e.dedupeKey) {
      const dup = this.events.find((x) => x.dedupe === e.dedupeKey);
      if (dup) return { inserted: false, id: dup.id };
    }
    const id = newId("evt");
    this.events.push({ id, provider: e.provider, planId: e.planId, direction: e.direction, kind: e.kind, summary: e.summary, detail: e.detail ?? null, at: e.at ?? new Date().toISOString(), dedupe: e.dedupeKey ?? null, userId: e.userId ?? null });
    return { inserted: true, id };
  }
  async listEvents(q: { planId?: string; provider?: string; limit: number; userId?: string }) {
    return this.events
      .filter((e) => (!q.planId || e.planId === q.planId) && (!q.provider || e.provider === q.provider) && (!q.userId || e.userId === q.userId))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, q.limit)
      .map(({ dedupe: _d, userId: _u, ...rest }) => { void _d; void _u; return rest; });
  }
  async hasDedupe(key: string) { return this.events.some((e) => e.dedupe === key); }
  async lastEventAt(provider: string, userId?: string) {
    return this.events.filter((e) => e.provider === provider && (!userId || e.userId === userId)).map((e) => e.at).sort().pop() ?? null;
  }
  async saveThread(t: Omit<ThreadRow, "id" | "lastCheckedAt">) {
    const row: ThreadRow = { ...t, id: newId("thr"), lastCheckedAt: null, userId: t.userId ?? null };
    this.threads.push(row);
    return row;
  }
  async threadsForPlan(planId: string, provider?: string, userId?: string) { return this.threads.filter((t) => t.planId === planId && (!provider || t.provider === provider) && (!userId || t.userId === userId)); }
  async openThreads(provider: string, sinceIso: string, userId?: string) { return this.threads.filter((t) => t.provider === provider && t.sentAt >= sinceIso && (!userId || t.userId === userId)); }
  async findThread(provider: string, threadId: string) { return this.threads.find((t) => t.provider === provider && t.threadId === threadId) ?? null; }
  async touchThread(id: string, at: string) { const t = this.threads.find((x) => x.id === id); if (t) t.lastCheckedAt = at; }
  async markWebhookSeen(id: string) { if (this.seen.has(id)) return false; this.seen.add(id); return true; }
}

let memory: MemoryStore | null = null;

export function resetMemoryStore(): void {
  memory = null;
}

export function getStore(env: ConnectorEnv): CommsStore {
  if (env.DB) return new D1Store(env.DB);
  memory ??= new MemoryStore();
  return memory;
}

export { DEMO_USER_ID };
