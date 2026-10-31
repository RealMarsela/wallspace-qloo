// Builds the pre-computed sample plan the judges land on: the whole pipeline once, with Qloo LIVE (every answer a live call or a copy of
// one in .data/qloo-live-cache), Token Factory live and Tavily live behind the pre-warm budget.
// Run: scripts/sample-plan.sh   (the Qloo key comes from the vault; never printed)
// Output: fixtures/qloo-private/sample-plan.json (gitignored: it carries Qloo-derived heat) for scripts/seed-sample-plan.mts.
// Afterwards scripts/qloo-cache-push.sh copies the cache into production KV so the deployed app serves the same live answers.
import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RunStep } from "../src/contract";
import type { KvMin } from "../src/server/agent/ports";
import { runPlanPipeline } from "../src/server/agent/pipeline";
import { directRunner } from "../src/server/agent/steps";
import { MemoryStore } from "../src/server/db/memory";
import { tokenFactoryFor } from "../src/server/agent/env";
import { TavilyBudgetCore, memoryBudget, type BudgetStorage } from "../src/server/tavily/budget-core";
import { Tavily } from "../src/server/tavily/client";
import { FileKv, liveAdapters, preloadProbe, sampleBrief } from "./_live-qloo";

const say = (s: string) => process.stdout.write(s + "\n");

class FileJson {
  private data: Record<string, unknown>;
  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.data = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>) : {};
  }
  get<T>(k: string) { return this.data[k] as T | undefined; }
  set(k: string, v: unknown) { this.data[k] = v; writeFileSync(this.path, JSON.stringify(this.data)); }
}

const cache = new FileJson(".data/b2-cache/kv.json");
const kv: KvMin = { get: async (k) => cache.get<string>(`kv:${k}`) ?? null, put: async (k, v) => cache.set(`kv:${k}`, v) };
const budgetStore: BudgetStorage = { get: async <T,>(k: string) => cache.get<T>(`budget:${k}`), put: async <T,>(k: string, v: T) => cache.set(`budget:${k}`, v) };

const env = { ...process.env, TF_MODE: "live", QLOO_MODE: "live" } as Record<string, string>;
const tf = tokenFactoryFor(env);
if (!tf) throw new Error("NEBIUS_API_KEY is not set (inject.sh get NEBIUS_API_KEY --dir .)");
if (!env.QLOO_API_KEY) throw new Error("QLOO_API_KEY is not set (run scripts/sample-plan.sh)");
const qkv = new FileKv();
say(`${await preloadProbe(qkv)} cache entries added from the 30 Oct probe (real live responses)`);
const a = liveAdapters(env.QLOO_API_KEY, qkv);
const store = new MemoryStore();
const steps: RunStep[] = [];

const brief = sampleBrief();
await store.putBrief(brief);

const out = await runPlanPipeline({
  tf, qloo: a.qloo, scoring: a.scoring, faces: a.faces, kv,
  tavily: env.TAVILY_API_KEY ? new Tavily({ mode: "live", apiKey: env.TAVILY_API_KEY }) : null,
  budget: memoryBudget(new TavilyBudgetCore(budgetStore)), store, step: directRunner, sessionId: "builder-prewarm", bucket: "prewarm",
  emit: async (s) => { steps.push(s); say(`${s.role.padEnd(10)} ${String(s.ms).padStart(5)}ms $${(s.costUsd ?? 0).toFixed(5)} ${s.cached ? "cache" : "live "} ${s.title} :: ${s.summary.slice(0, 110)}`); },
}, { brief, planId: "plan-sample", runId: "run-sample", sample: true });

mkdirSync("fixtures/qloo-private", { recursive: true });
writeFileSync("fixtures/qloo-private/sample-plan.json", JSON.stringify({ brief, plan: out.plan, run: out.run }, null, 1));
const rows = await a.ledger.listLedger({ provider: "qloo" });
say(`\nQloo: ${rows.filter((r) => !r.cached && r.status === "ok").length} live calls, ${rows.filter((r) => r.cached).length} served from the cache, ${rows.filter((r) => r.status !== "ok").length} failed`);
say(`\nplan ${out.plan.id}: ${out.plan.picks.length} picks, $${out.plan.spendUsd}, ${out.plan.scoredCount} scored, ${out.plan.droppedCount} dropped; run cost $${out.run.costUsd}; ${out.run.steps.length} steps`);
