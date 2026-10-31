import { Brief, Plan, Run, RunStep } from "@/contract";
import type { D1Like } from "./bindings";
import type { LedgerRow, SignoffRow, Store } from "./types";

const RunHead = Run.omit({ steps: true });
const bool = (v: unknown) => (v ? 1 : 0);

interface Row { [k: string]: unknown }
const parse = <T>(schema: { parse(v: unknown): T }, json: unknown): T => schema.parse(JSON.parse(String(json)));

/** Production driver over D1 (binding WS_DB, schema in migrations/0001_init.sql). */
export class D1Store implements Store {
  readonly driver = "d1" as const;
  constructor(private readonly db: D1Like) {}

  async putBrief(brief: Brief): Promise<void> {
    const b = Brief.parse(brief);
    await this.db.prepare("INSERT INTO briefs (id, json, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, created_at = excluded.created_at").bind(b.id, JSON.stringify(b), b.createdAt).run();
  }
  async getBrief(id: string): Promise<Brief | null> {
    const r = await this.db.prepare("SELECT json FROM briefs WHERE id = ?").bind(id).first<Row>();
    return r ? parse(Brief, r.json) : null;
  }
  async putPlan(plan: Plan): Promise<void> {
    const p = Plan.parse(plan);
    await this.db
      .prepare("INSERT INTO plans (id, brief_id, run_id, status, sample, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET brief_id = excluded.brief_id, run_id = excluded.run_id, status = excluded.status, sample = excluded.sample, json = excluded.json, created_at = excluded.created_at, updated_at = excluded.updated_at")
      .bind(p.id, p.briefId, p.runId, p.status, bool(p.sample), JSON.stringify(p), p.createdAt, new Date().toISOString())
      .run();
  }
  async getPlan(id: string): Promise<Plan | null> {
    const r = await this.db.prepare("SELECT json FROM plans WHERE id = ?").bind(id).first<Row>();
    return r ? parse(Plan, r.json) : null;
  }
  async listPlans(limit = 50, scope?: { workspaceId: string | null }): Promise<Plan[]> {
    const q = !scope
      ? this.db.prepare("SELECT json FROM plans ORDER BY created_at DESC LIMIT ?").bind(limit)
      : this.db.prepare("SELECT json FROM plans WHERE sample = 1 OR (? IS NOT NULL AND workspace_id = ?) ORDER BY created_at DESC LIMIT ?").bind(scope.workspaceId, scope.workspaceId, limit);
    return (await q.all<Row>()).results.map((x) => parse(Plan, x.json));
  }
  async assignOwner(kind: "brief" | "plan", id: string, workspaceId: string): Promise<void> {
    await this.db.prepare(`UPDATE ${kind === "brief" ? "briefs" : "plans"} SET workspace_id = ? WHERE id = ?`).bind(workspaceId, id).run();
  }
  async ownerOf(kind: "brief" | "plan", id: string): Promise<string | null> {
    const r = await this.db.prepare(`SELECT workspace_id FROM ${kind === "brief" ? "briefs" : "plans"} WHERE id = ?`).bind(id).first<Row>();
    return (r?.workspace_id as string | null) ?? null;
  }
  async listBriefs(workspaceId: string, limit = 50): Promise<Brief[]> {
    const r = await this.db.prepare("SELECT json FROM briefs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?").bind(workspaceId, limit).all<Row>();
    return r.results.map((x) => parse(Brief, x.json));
  }
  async putRun(run: Omit<Run, "steps">): Promise<void> {
    const r = RunHead.parse(run);
    await this.db
      .prepare("INSERT OR REPLACE INTO runs (id, plan_id, kind, status, cost_usd, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(r.id, r.planId, r.kind, r.status, r.costUsd, r.startedAt, r.endedAt)
      .run();
  }
  async appendStep(runId: string, step: RunStep): Promise<void> {
    const s = RunStep.parse(step);
    await this.db
      .prepare("INSERT OR REPLACE INTO run_steps (id, run_id, seq, at, role, model, status, cached, json) VALUES (?, ?, COALESCE((SELECT seq FROM run_steps WHERE id = ?), (SELECT COALESCE(MAX(seq), 0) + 1 FROM run_steps WHERE run_id = ?)), ?, ?, ?, ?, ?, ?)")
      .bind(s.id, runId, s.id, runId, s.at, s.role, s.model, s.status, bool(s.cached), JSON.stringify(s))
      .run();
  }
  private async head(id: string): Promise<Omit<Run, "steps"> | null> {
    const r = await this.db.prepare("SELECT * FROM runs WHERE id = ?").bind(id).first<Row>();
    return r ? this.toHead(r) : null;
  }
  private toHead(r: Row): Omit<Run, "steps"> {
    return RunHead.parse({ id: r.id, planId: r.plan_id, kind: r.kind, status: r.status, costUsd: r.cost_usd, startedAt: r.started_at, endedAt: r.ended_at ?? null });
  }
  private async steps(runId: string): Promise<RunStep[]> {
    const r = await this.db.prepare("SELECT json FROM run_steps WHERE run_id = ? ORDER BY seq").bind(runId).all<Row>();
    return r.results.map((x) => parse(RunStep, x.json));
  }
  async getRun(id: string): Promise<Run | null> {
    const h = await this.head(id);
    return h ? { ...h, steps: await this.steps(id) } : null;
  }
  async listRuns(opts: { kind?: Run["kind"]; limit?: number } = {}): Promise<Run[]> {
    const r = opts.kind
      ? await this.db.prepare("SELECT * FROM runs WHERE kind = ? ORDER BY started_at DESC LIMIT ?").bind(opts.kind, opts.limit ?? 50).all<Row>()
      : await this.db.prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?").bind(opts.limit ?? 50).all<Row>();
    return Promise.all(r.results.map(async (x) => ({ ...this.toHead(x), steps: await this.steps(String(x.id)) })));
  }
  async addSignoff(row: SignoffRow): Promise<void> {
    await this.db
      .prepare("INSERT OR REPLACE INTO plan_signoffs (id, plan_id, face_id, line_index, engine, status, text, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(row.id, row.planId, row.faceId, row.lineIndex, row.engine, row.status, row.text, JSON.stringify(row.json ?? null), row.createdAt)
      .run();
  }
  async listSignoffs(planId?: string): Promise<SignoffRow[]> {
    const q = planId
      ? this.db.prepare("SELECT * FROM plan_signoffs WHERE plan_id = ? ORDER BY created_at").bind(planId)
      : this.db.prepare("SELECT * FROM plan_signoffs ORDER BY created_at");
    return (await q.all<Row>()).results.map((r) => ({
      id: String(r.id), planId: String(r.plan_id), faceId: (r.face_id as string | null) ?? null, lineIndex: (r.line_index as number | null) ?? null,
      engine: r.engine as SignoffRow["engine"], status: r.status as SignoffRow["status"], text: String(r.text), json: JSON.parse(String(r.json)), createdAt: String(r.created_at),
    }));
  }
  async appendLedger(row: LedgerRow): Promise<void> {
    await this.db
      .prepare("INSERT OR REPLACE INTO ledger (id, at, provider, endpoint, request_key, cached, mode, status, ms, cost_usd, plan_id, run_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(row.id, row.at, row.provider, row.endpoint, row.requestKey, bool(row.cached), row.mode, row.status, row.ms, row.costUsd, row.planId, row.runId, row.note)
      .run();
  }
  async listLedger(opts: { provider?: LedgerRow["provider"]; limit?: number } = {}): Promise<LedgerRow[]> {
    const limit = opts.limit ?? 500;
    const q = opts.provider
      ? this.db.prepare("SELECT * FROM ledger WHERE provider = ? ORDER BY at DESC LIMIT ?").bind(opts.provider, limit)
      : this.db.prepare("SELECT * FROM ledger ORDER BY at DESC LIMIT ?").bind(limit);
    return (await q.all<Row>()).results.map((r) => ({
      id: String(r.id), at: String(r.at), provider: r.provider as LedgerRow["provider"], endpoint: String(r.endpoint), requestKey: (r.request_key as string | null) ?? null,
      cached: Boolean(r.cached), mode: r.mode as LedgerRow["mode"], status: r.status as LedgerRow["status"], ms: (r.ms as number | null) ?? null,
      costUsd: (r.cost_usd as number | null) ?? null, planId: (r.plan_id as string | null) ?? null, runId: (r.run_id as string | null) ?? null, note: (r.note as string | null) ?? null,
    }));
  }
  async setMetric(key: string, value: unknown): Promise<void> {
    await this.db.prepare("INSERT OR REPLACE INTO metrics (key, json, updated_at) VALUES (?, ?, ?)").bind(key, JSON.stringify(value), new Date().toISOString()).run();
  }
  async getMetric<T = unknown>(key: string): Promise<{ value: T; updatedAt: string } | null> {
    const r = await this.db.prepare("SELECT json, updated_at FROM metrics WHERE key = ?").bind(key).first<Row>();
    return r ? { value: JSON.parse(String(r.json)) as T, updatedAt: String(r.updated_at) } : null;
  }
}
