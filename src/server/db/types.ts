import type { Brief, Plan, Run, RunStep } from "@/contract";

export interface SignoffRow {
  id: string;
  planId: string;
  faceId: string | null;
  lineIndex: number | null;
  engine: "live-guard" | "nemo-guardrails";
  status: "pass" | "blocked" | "rewritten";
  text: string;
  json: unknown;
  createdAt: string;
}

export interface LedgerRow {
  id: string;
  at: string;
  provider: "qloo" | "tavily" | "token-factory";
  endpoint: string;
  requestKey: string | null;
  cached: boolean;
  mode: "live" | "replay";
  status: "ok" | "error" | "blocked";
  ms: number | null;
  costUsd: number | null;
  planId: string | null;
  runId: string | null;
  note: string | null;
}

export interface PlanSummaryRow {
  id: string;
  briefId: string;
  status: Plan["status"];
  spendUsd: number;
  createdAt: string;
  sample: boolean;
}

/** Everything the app persists. D1 in production, a JSON file under `next dev`, memory in tests (STORE_DRIVER). */
export interface Store {
  readonly driver: "d1" | "file" | "memory";
  putBrief(brief: Brief): Promise<void>;
  getBrief(id: string): Promise<Brief | null>;
  putPlan(plan: Plan): Promise<void>;
  getPlan(id: string): Promise<Plan | null>;
  /** No scope: every plan (internal callers). With a scope: the plans a viewer may see, their workspace's own plus the public samples. */
  listPlans(limit?: number, scope?: { workspaceId: string | null }): Promise<Plan[]>;
  /** Ownership of briefs and plans (runs follow their plan). putBrief and putPlan never change an owner. */
  assignOwner(kind: "brief" | "plan", id: string, workspaceId: string): Promise<void>;
  ownerOf(kind: "brief" | "plan", id: string): Promise<string | null>;
  listBriefs(workspaceId: string, limit?: number): Promise<Brief[]>;
  putRun(run: Omit<Run, "steps">): Promise<void>;
  appendStep(runId: string, step: RunStep): Promise<void>;
  getRun(id: string): Promise<Run | null>;
  listRuns(opts?: { kind?: Run["kind"]; limit?: number }): Promise<Run[]>;
  addSignoff(row: SignoffRow): Promise<void>;
  listSignoffs(planId?: string): Promise<SignoffRow[]>;
  appendLedger(row: LedgerRow): Promise<void>;
  listLedger(opts?: { provider?: LedgerRow["provider"]; limit?: number }): Promise<LedgerRow[]>;
  setMetric(key: string, value: unknown): Promise<void>;
  getMetric<T = unknown>(key: string): Promise<{ value: T; updatedAt: string } | null>;
}
