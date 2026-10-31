import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Brief, Plan, RunStep } from "@/contract";
import type { D1Like, D1Statement } from "./bindings";
import { D1Store } from "./d1";
import { FileStore } from "./file";
import { MemoryStore } from "./memory";
import type { Store } from "./types";

// A D1 stand-in over node:sqlite so the real SQL in d1.ts and migrations/0001_init.sql runs in tests.
function sqliteD1(): D1Like {
  const db = new DatabaseSync(":memory:");
  for (const f of ["0001_init.sql", "0003_comms.sql", "0005_auth_workspaces.sql"]) db.exec(readFileSync(join(process.cwd(), "migrations", f), "utf8"));
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v) => stmt(sql, v),
    run: async () => { db.prepare(sql).run(...(args as never[])); return { results: [], success: true }; },
    first: async <T>() => (db.prepare(sql).get(...(args as never[])) as T | undefined) ?? null,
    all: async <T>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[], success: true }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())) };
}

const brief: Brief = {
  id: "brief-1", brandName: "Porchlight Comedy Tour (sample brand)", brandSample: true, audienceText: "people who love live stand-up",
  loves: ["stand-up comedy specials"], seeds: [], city: "atlanta", budgetUsd: 12000, flightStart: "2026-12-01", flightWeeks: 4,
  brandVoice: null, creativeUrl: null, createdAt: "2026-10-30T08:00:00.000Z",
};
const plan: Plan = {
  id: "plan-1", briefId: "brief-1", runId: "run-1", status: "ready", picks: [], scoredCount: 86, droppedCount: 4, spendUsd: 11200, split: [],
  heat: [], nemoJobId: null, lastRescanAt: null, createdAt: "2026-10-30T08:01:00.000Z", sample: false,
};
const step = (id: string, role: RunStep["role"] = "qloo"): RunStep => ({
  id, at: "2026-10-30T08:00:01.000Z", role, model: null, title: "map the audience", tool: "qloo.insights urn:heatmap", summary: "ok", ms: 120,
  tokensIn: null, tokensOut: null, costUsd: null, requestId: null, cached: true, status: "ok",
});

const dir = mkdtempSync(join(tmpdir(), "ws-store-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const drivers: [string, () => Store][] = [
  ["memory", () => new MemoryStore()],
  ["file", () => new FileStore(join(dir, `${Math.random()}.json`))],
  ["d1", () => new D1Store(sqliteD1())],
];

describe.each(drivers)("%s store", (_name, make) => {
  it("round-trips briefs and plans and lists newest first", async () => {
    const s = make();
    await s.putBrief(brief);
    await s.putPlan(plan);
    await s.putPlan({ ...plan, id: "plan-2", createdAt: "2026-10-30T09:00:00.000Z", sample: true });
    expect(await s.getBrief("brief-1")).toEqual(brief);
    expect(await s.getBrief("nope")).toBeNull();
    expect((await s.listPlans()).map((p) => p.id)).toEqual(["plan-2", "plan-1"]);
    expect((await s.getPlan("plan-1"))?.scoredCount).toBe(86);
  });
  it("keeps run steps in order, updates a step by id and filters runs by kind", async () => {
    const s = make();
    await s.putRun({ id: "run-1", planId: "plan-1", kind: "plan", status: "running", costUsd: 0, startedAt: "2026-10-30T08:00:00.000Z", endedAt: null });
    await s.putRun({ id: "run-2", planId: "plan-1", kind: "eval", status: "done", costUsd: 0.2, startedAt: "2026-10-30T09:00:00.000Z", endedAt: "2026-10-30T09:01:00.000Z" });
    await s.appendStep("run-1", step("s1"));
    await s.appendStep("run-1", step("s2", "lightning"));
    await s.appendStep("run-1", { ...step("s1"), summary: "updated" });
    const run = await s.getRun("run-1");
    expect(run?.steps.map((x) => x.id)).toEqual(["s1", "s2"]);
    expect(run?.steps[0].summary).toBe("updated");
    expect((await s.listRuns({ kind: "eval" })).map((r) => r.id)).toEqual(["run-2"]);
    expect((await s.listRuns()).map((r) => r.id)).toEqual(["run-2", "run-1"]);
    expect(await s.getRun("missing")).toBeNull();
  });
  it("stores signoffs, ledger rows and metrics", async () => {
    const s = make();
    await s.addSignoff({ id: "so1", planId: "plan-1", faceId: "ATL-0101", lineIndex: 0, engine: "live-guard", status: "blocked", text: "x", json: { reasons: ["a"] }, createdAt: "2026-10-30T08:00:00.000Z" });
    expect((await s.listSignoffs("plan-1"))[0].status).toBe("blocked");
    expect(await s.listSignoffs("other")).toEqual([]);
    await s.appendLedger({ id: "l1", at: "2026-10-30T08:00:00.000Z", provider: "qloo", endpoint: "/v2/insights", requestKey: "k", cached: false, mode: "live", status: "ok", ms: 90, costUsd: null, planId: null, runId: null, note: null });
    await s.appendLedger({ id: "l2", at: "2026-10-30T08:00:01.000Z", provider: "tavily", endpoint: "/search", requestKey: null, cached: true, mode: "replay", status: "ok", ms: null, costUsd: 0, planId: null, runId: null, note: "n" });
    expect((await s.listLedger({ provider: "qloo" })).map((l) => l.id)).toEqual(["l1"]);
    expect((await s.listLedger()).map((l) => l.id)).toEqual(["l2", "l1"]);
    await s.setMetric("nemo.stats", { catchRate: 0.9 });
    expect((await s.getMetric<{ catchRate: number }>("nemo.stats"))?.value.catchRate).toBe(0.9);
    expect(await s.getMetric("none")).toBeNull();
  });
  it("tracks owners, keeps them across rewrites and scopes plan and brief lists", async () => {
    const s = make();
    await s.putBrief(brief);
    await s.putPlan(plan);
    await s.putPlan({ ...plan, id: "plan-s", sample: true, createdAt: "2026-10-30T07:00:00.000Z" });
    await s.putPlan({ ...plan, id: "plan-x", createdAt: "2026-10-30T06:00:00.000Z" });
    await s.assignOwner("brief", "brief-1", "ws-a");
    await s.assignOwner("plan", "plan-1", "ws-a");
    await s.assignOwner("plan", "plan-x", "ws-b");
    await s.putPlan({ ...plan, status: "failed" }); // a workflow rewrite must not drop the owner
    await s.putBrief(brief);
    expect(await s.ownerOf("plan", "plan-1")).toBe("ws-a");
    expect(await s.ownerOf("brief", "brief-1")).toBe("ws-a");
    expect(await s.ownerOf("plan", "nope")).toBeNull();
    expect((await s.listPlans(50, { workspaceId: "ws-a" })).map((p) => p.id)).toEqual(["plan-1", "plan-s"]);
    expect((await s.listPlans(50, { workspaceId: null })).map((p) => p.id)).toEqual(["plan-s"]);
    expect((await s.listBriefs("ws-a")).map((b) => b.id)).toEqual(["brief-1"]);
    expect(await s.listBriefs("ws-b")).toEqual([]);
  });
  it("rejects data that breaks the contract", async () => {
    const s = make();
    await expect(s.putPlan({ ...plan, status: "weird" as never })).rejects.toThrow();
  });
});
