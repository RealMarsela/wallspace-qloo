import { DEMO_USER_ID, type ConnectorEvent } from "@/contract/connectors-comms";
import type { D1Like } from "./env";
import type { AccountRow, CommsStore, NewEvent, ThreadRow } from "./store";
import { newId } from "./store";

type Row = Record<string, unknown>;

function parseDetail(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "string") return null;
  try {
    const o: unknown = JSON.parse(v);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function threadFrom(r: Row): ThreadRow {
  return {
    id: String(r.id), planId: String(r.plan_id), provider: String(r.provider),
    threadId: (r.thread_id as string | null) ?? null, messageId: (r.message_id as string | null) ?? null,
    token: String(r.token), recipient: (r.recipient as string | null) ?? null, sentAt: String(r.sent_at),
    lastCheckedAt: (r.last_checked_at as string | null) ?? null, userId: (r.user_id as string | null) ?? null,
  };
}

export class D1Store implements CommsStore {
  constructor(private readonly db: D1Like) {}

  async upsertAccount(a: Omit<AccountRow, "updatedAt"> & { updatedAt?: string }) {
    await this.db
      .prepare(
        `INSERT INTO connector_accounts (provider, composio_account_id, user_id, label, status, updated_at) VALUES (?1,?2,?3,?4,?5,?6)
         ON CONFLICT(user_id, provider) DO UPDATE SET composio_account_id=?2, label=?4, status=?5, updated_at=?6`,
      )
      .bind(a.provider, a.composioAccountId, a.userId, a.label, a.status, a.updatedAt ?? new Date().toISOString())
      .run();
  }

  async getAccount(provider: string, userId = DEMO_USER_ID) {
    const r = await this.db.prepare("SELECT * FROM connector_accounts WHERE provider=?1 AND user_id=?2").bind(provider, userId).first<Row>();
    if (!r) return null;
    return { provider: String(r.provider), composioAccountId: (r.composio_account_id as string | null) ?? null, userId: String(r.user_id), label: (r.label as string | null) ?? null, status: String(r.status), updatedAt: String(r.updated_at) };
  }

  async deleteAccount(provider: string, userId = DEMO_USER_ID) {
    await this.db.prepare("DELETE FROM connector_accounts WHERE provider=?1 AND user_id=?2").bind(provider, userId).run();
  }

  async recordEvent(e: NewEvent) {
    const id = newId("evt");
    const res = await this.db
      .prepare("INSERT OR IGNORE INTO connector_events (id, provider, plan_id, direction, kind, summary, detail, dedupe_key, at, user_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)")
      .bind(id, e.provider, e.planId, e.direction, e.kind, e.summary, e.detail ? JSON.stringify(e.detail) : null, e.dedupeKey ?? null, e.at ?? new Date().toISOString(), e.userId ?? null)
      .run();
    return { inserted: (res.meta?.changes ?? 1) > 0, id };
  }

  async listEvents(q: { planId?: string; provider?: string; limit: number; userId?: string }): Promise<ConnectorEvent[]> {
    const out = await this.db
      .prepare("SELECT * FROM connector_events WHERE (?1 IS NULL OR plan_id=?1) AND (?2 IS NULL OR provider=?2) AND (?4 IS NULL OR user_id=?4) ORDER BY at DESC LIMIT ?3")
      .bind(q.planId ?? null, q.provider ?? null, q.limit, q.userId ?? null)
      .all<Row>();
    return (out.results ?? []).map((r) => ({
      id: String(r.id), provider: String(r.provider), planId: (r.plan_id as string | null) ?? null,
      direction: r.direction === "in" ? "in" : "out", kind: String(r.kind) as ConnectorEvent["kind"],
      summary: String(r.summary), detail: parseDetail(r.detail), at: String(r.at),
    }));
  }

  async hasDedupe(key: string) {
    const r = await this.db.prepare("SELECT 1 AS hit FROM connector_events WHERE dedupe_key=?1 LIMIT 1").bind(key).first<Row>();
    return !!r;
  }

  async lastEventAt(provider: string, userId?: string) {
    const r = await this.db.prepare("SELECT MAX(at) AS at FROM connector_events WHERE provider=?1 AND (?2 IS NULL OR user_id=?2)").bind(provider, userId ?? null).first<Row>();
    return (r?.at as string | null) ?? null;
  }

  async saveThread(t: Omit<ThreadRow, "id" | "lastCheckedAt">) {
    const id = newId("thr");
    await this.db
      .prepare("INSERT INTO connector_threads (id, plan_id, provider, thread_id, message_id, token, recipient, sent_at, user_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)")
      .bind(id, t.planId, t.provider, t.threadId, t.messageId, t.token, t.recipient, t.sentAt, t.userId ?? null)
      .run();
    return { ...t, id, lastCheckedAt: null, userId: t.userId ?? null };
  }

  async threadsForPlan(planId: string, provider?: string, userId?: string) {
    const out = await this.db
      .prepare("SELECT * FROM connector_threads WHERE plan_id=?1 AND (?2 IS NULL OR provider=?2) AND (?3 IS NULL OR user_id=?3) ORDER BY sent_at DESC")
      .bind(planId, provider ?? null, userId ?? null)
      .all<Row>();
    return (out.results ?? []).map(threadFrom);
  }

  async openThreads(provider: string, sinceIso: string, userId?: string) {
    const out = await this.db.prepare("SELECT * FROM connector_threads WHERE provider=?1 AND sent_at>=?2 AND (?3 IS NULL OR user_id=?3)").bind(provider, sinceIso, userId ?? null).all<Row>();
    return (out.results ?? []).map(threadFrom);
  }

  async findThread(provider: string, threadId: string) {
    const r = await this.db.prepare("SELECT * FROM connector_threads WHERE provider=?1 AND thread_id=?2 LIMIT 1").bind(provider, threadId).first<Row>();
    return r ? threadFrom(r) : null;
  }

  async touchThread(id: string, at: string) {
    await this.db.prepare("UPDATE connector_threads SET last_checked_at=?2 WHERE id=?1").bind(id, at).run();
  }

  async markWebhookSeen(id: string) {
    const res = await this.db.prepare("INSERT OR IGNORE INTO composio_webhook_seen (id, at) VALUES (?1,?2)").bind(id, new Date().toISOString()).run();
    return (res.meta?.changes ?? 1) > 0;
  }
}
