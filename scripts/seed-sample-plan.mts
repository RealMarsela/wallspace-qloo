// Writes the pre-computed sample plan (fixtures/qloo-private/sample-plan.json from scripts/sample-plan.mts) into a store.
//   npx tsx scripts/seed-sample-plan.mts local            -> the file store under .data (next dev)
//   npx tsx scripts/seed-sample-plan.mts sql [out.sql]    -> SQL for D1 (INSERT OR REPLACE), printed path only
//   scripts/seed-sample-plan.sh                           -> sql + wrangler d1 execute --remote (needs the vault's Cloudflare token)
// Workspace model (lane B5, migration 0005): the public sample plan and its brief belong to the demo workspace "ws-demo"; a plan flagged
// sample is readable by everyone and writable by no one. Re-seeding keeps that ownership.
import { readFileSync, writeFileSync } from "node:fs";
import { Brief, Plan, Run } from "../src/contract/domain";
import { getStore } from "../src/server/db";

const say = (s: string) => process.stdout.write(s + "\n");
const raw = JSON.parse(readFileSync("fixtures/qloo-private/sample-plan.json", "utf8")) as Record<string, unknown>;
const brief = Brief.parse(raw.brief);
const plan = Plan.parse({ ...(raw.plan as object), sample: true });
const run = Run.parse(raw.run);

const DEMO_WORKSPACE = "ws-demo";
const q = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown) => q(JSON.stringify(v));

function sql(): string {
  const now = new Date().toISOString();
  const out = [
    `INSERT OR REPLACE INTO briefs (id, json, created_at, workspace_id) VALUES (${q(brief.id)}, ${j(brief)}, ${q(brief.createdAt)}, ${q(DEMO_WORKSPACE)});`,
    `INSERT OR REPLACE INTO plans (id, brief_id, run_id, status, sample, json, created_at, updated_at, workspace_id) VALUES (${q(plan.id)}, ${q(plan.briefId)}, ${q(plan.runId)}, ${q(plan.status)}, 1, ${j(plan)}, ${q(plan.createdAt)}, ${q(now)}, ${q(DEMO_WORKSPACE)});`,
    `INSERT OR REPLACE INTO runs (id, plan_id, kind, status, cost_usd, started_at, ended_at) VALUES (${q(run.id)}, ${q(run.planId)}, ${q(run.kind)}, ${q(run.status)}, ${run.costUsd}, ${q(run.startedAt)}, ${q(run.endedAt)});`,
    `DELETE FROM run_steps WHERE run_id = ${q(run.id)};`,
  ];
  run.steps.forEach((s, i) => out.push(`INSERT OR REPLACE INTO run_steps (id, run_id, seq, at, role, model, status, cached, json) VALUES (${q(s.id)}, ${q(run.id)}, ${i + 1}, ${q(s.at)}, ${q(s.role)}, ${q(s.model)}, ${q(s.status)}, ${s.cached ? 1 : 0}, ${j(s)});`));
  return out.join("\n") + "\n";
}

const mode = process.argv[2];
if (mode === "local") {
  const store = await getStore({ STORE_DRIVER: "file", STORE_FILE: ".data/wallspace-store.json" } as never);
  await store.putBrief(brief);
  await store.putPlan(plan);
  await store.assignOwner("brief", brief.id, DEMO_WORKSPACE);
  await store.assignOwner("plan", plan.id, DEMO_WORKSPACE);
  await store.putRun({ id: run.id, planId: run.planId, kind: run.kind, status: run.status, costUsd: run.costUsd, startedAt: run.startedAt, endedAt: run.endedAt });
  for (const s of run.steps) await store.appendStep(run.id, s);
  say(`seeded local store: ${plan.id}, ${run.steps.length} steps`);
} else if (mode === "sql") {
  const out = process.argv[3] ?? ".data/sample-plan.sql";
  writeFileSync(out, sql());
  say(out);
} else {
  throw new Error("usage: seed-sample-plan.mts local | sql [out.sql]");
}
