import type { Brief, RunStep } from "@/contract";
import { buildDeps } from "../agent/deps";
import type { B2Env } from "../agent/env";
import { tokenFactoryFor } from "../agent/env";
import { loadAdapters } from "../agent/adapters";
import { runPlanPipeline } from "../agent/pipeline";
import { buildRun, codeStep, emitSteps, runHead, type StepRunner } from "../agent/steps";
import { makeSink } from "../agent/sink";
import { newId } from "../agent/http";
import type { Store } from "../db/types";
import { getStore } from "../db";
import { guardText } from "../guard";
import { evalBriefs, guardCases } from "./eval-set";

export interface EvalParams {
  runId: string;
  at: string;
  briefCount?: number; // default all ten
}

// Plan and brief writes of an eval plan are thrown away (they must not show up in the plan list); provider ledger rows stay.
function discarding(store: Store): Store {
  const noop = async () => undefined;
  return Object.assign(Object.create(store) as Store, { putBrief: noop, putPlan: noop, putRun: noop, appendStep: noop });
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

export async function executeEval(env: B2Env, p: EvalParams, step: StepRunner) {
  const store = await getStore(env as never);
  const tf = tokenFactoryFor(env);
  const sink = makeSink(env, store, { runId: p.runId, planId: "eval" });
  const log: RunStep[] = [];
  await store.putRun({ id: p.runId, planId: "eval", kind: "eval", status: "running", costUsd: 0, startedAt: p.at, endedAt: null });

  const g = await step("guard", async () => {
    let caught = 0, attacks = 0, falsePos = 0, legit = 0;
    const t0 = Date.now();
    for (const c of guardCases) {
      const r = await guardText(c.text, { kind: "brief", tf });
      const blocked = r.verdict.status !== "pass";
      if (c.expect === "block") { attacks += 1; if (blocked) caught += 1; } else { legit += 1; if (blocked) falsePos += 1; }
    }
    const summary = { attacks, caught, legit, falsePositives: falsePos, catchRate: round(caught / attacks), falsePositiveRate: round(falsePos / legit) };
    const steps = await emitSteps(sink, `${p.runId}:eval-guard`, [codeStep("live-guard", "guard sweep", "live-guard", `${caught}/${attacks} identity attempts blocked, ${falsePos}/${legit} taste prompts wrongly blocked`, Date.now() - t0)]);
    return { summary, steps };
  });
  log.push(...g.steps);

  const briefs = evalBriefs.slice(0, p.briefCount ?? evalBriefs.length);
  const rows: { cost: number; picks: number; dropped: number; coverage: number; gaps: string[] }[] = [];
  for (const [i, b] of briefs.entries()) {
    const row = await step(`plan:${i}`, async () => {
      const brief: Brief = { ...b, id: newId("eval-brief"), brandSample: true, seeds: [], city: "atlanta", creativeUrl: null, createdAt: p.at };
      const steps: RunStep[] = [];
      const deps = await buildDeps(env, { runId: `${p.runId}-${i}`, planId: `${p.runId}-p${i}`, sessionId: "eval", bucket: "prewarm" });
      const run = await runPlanPipeline({ ...deps, store: discarding(deps.store), tavily: null, emit: async (s) => void steps.push(s) }, { brief, planId: `${p.runId}-p${i}`, runId: `${p.runId}-${i}`, sample: false });
      const gaps: string[] = [];
      for (const love of b.loves) if (!(await (await loadAdapters(env, { runId: p.runId })).qloo.search(love)).data) gaps.push(love);
      const covered = run.plan.picks.filter((k) => k.evidence.filter((e) => e.kind !== "tavily-event").length >= 3).length;
      const out = { cost: run.run.costUsd, picks: run.plan.picks.length, dropped: run.plan.droppedCount, coverage: run.plan.picks.length ? covered / run.plan.picks.length : 0, gaps };
      const stamped = await emitSteps(sink, `${p.runId}:eval-plan-${i}`, [{ ...codeStep("super-vl", `eval brief ${i + 1}: ${b.brandName}`, "pipeline", `${out.picks} picks, ${out.dropped} faces dropped, $${out.cost.toFixed(3)}, evidence coverage ${Math.round(out.coverage * 100)}%`), costUsd: out.cost }]);
      return { ...out, steps: stamped };
    }).catch(async (e) => {
      const stamped = await emitSteps(sink, `${p.runId}:eval-plan-${i}`, [codeStep("super-vl", `eval brief ${i + 1}: ${b.brandName}`, "pipeline", `failed: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`, 0, "error")]);
      return { cost: 0, picks: 0, dropped: 0, coverage: 0, gaps: [], steps: stamped, failed: true };
    });
    log.push(...row.steps);
    if (!("failed" in row)) rows.push(row);
  }

  const ok = rows.length || 1;
  const result = {
    at: p.at, runId: p.runId, plans: rows.length, briefsTried: briefs.length,
    costPerPlanUsd: round(rows.reduce((a, r) => a + r.cost, 0) / ok), facesDroppedForEvidence: rows.reduce((a, r) => a + r.dropped, 0),
    evidenceCoverage: round(rows.reduce((a, r) => a + r.coverage, 0) / ok), guard: g.summary,
    qlooCoverageGaps: [...new Set(rows.flatMap((r) => r.gaps))],
  };
  await step("write", async () => {
    await store.setMetric("eval.latest", result);
    await store.setMetric("guard.live", { blocked: g.summary.caught, falsePositives: g.summary.falsePositives, catchRate: g.summary.catchRate, falsePositiveRate: g.summary.falsePositiveRate, checked: g.summary.attacks + g.summary.legit });
    await store.setMetric("qloo.coverage_gaps", result.qlooCoverageGaps);
    await store.setMetric("plans.cost", { costPerPlanUsd: result.costPerPlanUsd, plans: result.plans, facesDroppedForEvidence: result.facesDroppedForEvidence, updatedAt: p.at });
    return true;
  });
  await store.putRun(runHead(buildRun(p.runId, "eval", "eval", log, "done", p.at)));
  return result;
}
