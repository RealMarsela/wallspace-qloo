import { RecordEvent, RecordLink, type RecordsProvider } from "@/contract/connectors-records";
import type { RecordsStore } from "./types";

// Structural subset of the D1 binding (matches B3's D1Like), so this file needs no Workers types.
interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}
export interface D1Db {
  prepare(sql: string): D1Stmt;
}

type LinkRow = { plan_id: string; provider: string; kind: string; external_id: string; url: string | null; snapshot: string | null; updated_at: string };
type EventRow = { id: string; plan_id: string; provider: string; direction: string; kind: string; summary: string; detail: string | null; ok: number; at: string };

const parseJson = (s: string | null): Record<string, unknown> | null => {
  if (!s) return null;
  try {
    const v: unknown = JSON.parse(s);
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const toLink = (r: LinkRow): RecordLink =>
  RecordLink.parse({ planId: r.plan_id, provider: r.provider, kind: r.kind, externalId: r.external_id, url: r.url, snapshot: parseJson(r.snapshot), updatedAt: r.updated_at });

const toEvent = (r: EventRow): RecordEvent =>
  RecordEvent.parse({ id: r.id, planId: r.plan_id, provider: r.provider, direction: r.direction, kind: r.kind, summary: r.summary, detail: parseJson(r.detail), ok: r.ok === 1, at: r.at });

export function d1RecordsStore(db: D1Db): RecordsStore {
  return {
    async getLinks(planId, provider) {
      const sql = provider ? "SELECT * FROM record_links WHERE plan_id = ? AND provider = ?" : "SELECT * FROM record_links WHERE plan_id = ?";
      const stmt = db.prepare(sql).bind(...(provider ? [planId, provider] : [planId]));
      return ((await stmt.all<LinkRow>()).results ?? []).map(toLink);
    },
    async putLink(l) {
      await db.prepare(
        `INSERT INTO record_links (plan_id, provider, kind, external_id, url, snapshot, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (plan_id, provider, kind, external_id) DO UPDATE SET url = excluded.url, snapshot = excluded.snapshot, updated_at = excluded.updated_at`,
      ).bind(l.planId, l.provider, l.kind, l.externalId, l.url, l.snapshot ? JSON.stringify(l.snapshot) : null, l.updatedAt).run();
    },
    async linksByProvider(provider: RecordsProvider) {
      return ((await db.prepare("SELECT * FROM record_links WHERE provider = ?").bind(provider).all<LinkRow>()).results ?? []).map(toLink);
    },
    async appendEvent(e) {
      await db.prepare("INSERT INTO record_sync_log (id, plan_id, provider, direction, kind, summary, detail, ok, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(e.id, e.planId, e.provider, e.direction, e.kind, e.summary, e.detail ? JSON.stringify(e.detail) : null, e.ok ? 1 : 0, e.at).run();
    },
    async listEvents(planId, limit = 50) {
      const rows = (await db.prepare("SELECT * FROM record_sync_log WHERE plan_id = ? ORDER BY at DESC LIMIT ?").bind(planId, limit).all<EventRow>()).results ?? [];
      return rows.map(toEvent);
    },
  };
}
