import { Brief, Plan, Run, RunStep } from "@/contract";
import type { LedgerRow, SignoffRow, Store } from "./types";

export interface MemoryData {
  briefs: Record<string, unknown>;
  plans: Record<string, unknown>;
  runs: Record<string, Omit<Run, "steps">>;
  steps: Record<string, RunStep[]>;
  signoffs: SignoffRow[];
  ledger: LedgerRow[];
  metrics: Record<string, { value: unknown; updatedAt: string }>;
  owners: Record<string, string>; // "brief:<id>" | "plan:<id>" -> workspace id
}
export const emptyData = (): MemoryData => ({ briefs: {}, plans: {}, runs: {}, steps: {}, signoffs: [], ledger: [], metrics: {}, owners: {} });

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const RunHead = Run.omit({ steps: true });

/** In-memory store: the test driver, and the base of the file driver (which persists after every write). */
export class MemoryStore implements Store {
  readonly driver: "memory" | "file" = "memory";
  protected data: MemoryData = emptyData();
  /** The file driver overrides these two. */
  protected async load(): Promise<void> {}
  protected async persist(): Promise<void> {}
  private loaded?: Promise<void>;
  protected async ready(): Promise<void> {
    this.loaded ??= this.load();
    await this.loaded;
  }
  private async write(fn: () => void): Promise<void> {
    await this.ready();
    fn();
    await this.persist();
  }

  async putBrief(brief: Brief): Promise<void> {
    await this.write(() => { this.data.briefs[brief.id] = clone(Brief.parse(brief)); });
  }
  async getBrief(id: string): Promise<Brief | null> {
    await this.ready();
    return this.data.briefs[id] ? Brief.parse(this.data.briefs[id]) : null;
  }
  async putPlan(plan: Plan): Promise<void> {
    await this.write(() => { this.data.plans[plan.id] = clone(Plan.parse(plan)); });
  }
  async getPlan(id: string): Promise<Plan | null> {
    await this.ready();
    return this.data.plans[id] ? Plan.parse(this.data.plans[id]) : null;
  }
  async listPlans(limit = 50, scope?: { workspaceId: string | null }): Promise<Plan[]> {
    await this.ready();
    return Object.values(this.data.plans)
      .map((p) => Plan.parse(p))
      .filter((p) => !scope || p.sample || (scope.workspaceId !== null && this.data.owners[`plan:${p.id}`] === scope.workspaceId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  async assignOwner(kind: "brief" | "plan", id: string, workspaceId: string): Promise<void> {
    await this.write(() => { (this.data.owners ??= {})[`${kind}:${id}`] = workspaceId; });
  }
  async ownerOf(kind: "brief" | "plan", id: string): Promise<string | null> {
    await this.ready();
    return this.data.owners?.[`${kind}:${id}`] ?? null;
  }
  async listBriefs(workspaceId: string, limit = 50): Promise<Brief[]> {
    await this.ready();
    return Object.values(this.data.briefs)
      .map((b) => Brief.parse(b))
      .filter((b) => this.data.owners?.[`brief:${b.id}`] === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  async putRun(run: Omit<Run, "steps">): Promise<void> {
    await this.write(() => { this.data.runs[run.id] = clone(RunHead.parse(run)); });
  }
  async appendStep(runId: string, step: RunStep): Promise<void> {
    await this.write(() => {
      const list = (this.data.steps[runId] ??= []);
      const parsed = clone(RunStep.parse(step));
      const at = list.findIndex((s) => s.id === parsed.id);
      if (at >= 0) list[at] = parsed;
      else list.push(parsed);
    });
  }
  async getRun(id: string): Promise<Run | null> {
    await this.ready();
    const head = this.data.runs[id];
    return head ? Run.parse({ ...head, steps: this.data.steps[id] ?? [] }) : null;
  }
  async listRuns(opts: { kind?: Run["kind"]; limit?: number } = {}): Promise<Run[]> {
    await this.ready();
    return Object.values(this.data.runs)
      .filter((r) => !opts.kind || r.kind === opts.kind)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, opts.limit ?? 50)
      .map((r) => Run.parse({ ...r, steps: this.data.steps[r.id] ?? [] }));
  }
  async addSignoff(row: SignoffRow): Promise<void> {
    await this.write(() => {
      this.data.signoffs = this.data.signoffs.filter((s) => s.id !== row.id).concat(clone(row));
    });
  }
  async listSignoffs(planId?: string): Promise<SignoffRow[]> {
    await this.ready();
    return clone(this.data.signoffs.filter((s) => !planId || s.planId === planId));
  }
  async appendLedger(row: LedgerRow): Promise<void> {
    await this.write(() => { this.data.ledger.push(clone(row)); });
  }
  async listLedger(opts: { provider?: LedgerRow["provider"]; limit?: number } = {}): Promise<LedgerRow[]> {
    await this.ready();
    return clone(this.data.ledger.filter((l) => !opts.provider || l.provider === opts.provider).slice(-(opts.limit ?? 500)).reverse());
  }
  async setMetric(key: string, value: unknown): Promise<void> {
    await this.write(() => { this.data.metrics[key] = { value: clone(value), updatedAt: new Date().toISOString() }; });
  }
  async getMetric<T = unknown>(key: string): Promise<{ value: T; updatedAt: string } | null> {
    await this.ready();
    const m = this.data.metrics[key];
    return m ? (clone(m) as { value: T; updatedAt: string }) : null;
  }
}
