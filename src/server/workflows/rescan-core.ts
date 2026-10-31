import { z } from "zod";
import type { Plan, RunStep } from "@/contract";
import { buildRun, codeStep, emitSteps, runHead, type StepRunner } from "../agent/steps";
import { makeSink } from "../agent/sink";
import { loadAdapters } from "../agent/adapters";
import type { B2Env } from "../agent/env";
import { tokenFactoryFor } from "../agent/env";
import { getStore } from "../db";
import { chatJson } from "../models";

export interface RescanParams {
  runId: string;
  trigger: "cron" | "manual";
  planId?: string; // omitted: every saved plan
  at: string;
}

const Judge = z.object({ shifted: z.array(z.string()).max(20), note: z.string().max(300) });

// Nightly re-scan: fresh Qloo trending for the tags each saved plan relies on, Lightning judges which faces' taste moved; flags tasteShifted.
export async function executeRescan(env: B2Env, p: RescanParams, step: StepRunner): Promise<{ plans: number; flagged: number }> {
  const store = await getStore(env as never);
  const tf = tokenFactoryFor(env);
  const a = await loadAdapters(env, { runId: p.runId });
  const sink = makeSink(env, store, { runId: p.runId, planId: p.planId ?? "all" });
  const log: RunStep[] = [];
  await store.putRun({ id: p.runId, planId: p.planId ?? "all", kind: "rescan", status: "running", costUsd: 0, startedAt: p.at, endedAt: null });

  const plans = await step("select", async () => {
    const all = p.planId ? [await store.getPlan(p.planId)] : await store.listPlans(50);
    const keep = all.filter((x): x is Plan => !!x && x.status !== "failed" && x.status !== "running" && x.picks.length > 0);
    return keep.map((x) => ({ id: x.id, tags: [...new Set(x.picks.flatMap((k) => k.topTags))].slice(0, 40), picks: x.picks.map((k) => ({ faceId: k.faceId, tags: k.topTags })) }));
  });

  let flagged = 0;
  for (const pl of plans) {
    const res = await step(`rescan:${pl.id}`, async () => {
      const t = await a.qloo.trending(pl.tags);
      const rising = t.data.filter((r) => r.rising).map((r) => r.name);
      const steps: RunStep[] = [{ ...codeStep("qloo", `trending tags for plan ${pl.id}`, t.tool, `${rising.length} of ${pl.tags.length} tags rising`, t.ms), cached: t.cached }];
      let shifted: string[] = [];
      const overlap = pl.picks.filter((k) => k.tags.some((x) => rising.includes(x)));
      if (rising.length && overlap.length && tf) {
        const j = await chatJson(tf, {
          role: "lightning", reasoning: "off", temperature: 0, maxTokens: 300,
          meta: { title: `judge which faces' taste shifted (${pl.id})`, tool: "rescan" },
          messages: [
            { role: "system", content: 'You compare the tags each billboard face was picked for against tags Qloo reports as rising. Name a face as shifted only when a rising tag is one of its top tags. Reply as JSON {"shifted":[faceId],"note":string}.' },
            { role: "user", content: `Rising tags: ${rising.join(", ")}\nFaces:\n${overlap.map((k) => `${k.faceId}: ${k.tags.join(", ")}`).join("\n")}` },
          ],
        }, Judge);
        steps.push(...j.steps.map((s) => ({ ...s, summary: `${j.value.shifted.length} face(s) shifted. ${j.value.note}` })));
        shifted = j.value.shifted.filter((id) => overlap.some((k) => k.faceId === id));
      }
      const plan = await store.getPlan(pl.id);
      if (plan) await store.putPlan({ ...plan, lastRescanAt: p.at, picks: plan.picks.map((k) => ({ ...k, tasteShifted: shifted.includes(k.faceId) })) });
      return { shifted, steps: await emitSteps(sink, `${p.runId}:rescan-${pl.id}`, steps) };
    });
    log.push(...res.steps);
    flagged += res.shifted.length;
  }
  await store.putRun(runHead(buildRun(p.runId, p.planId ?? "all", "rescan", log, "done", p.at)));
  return { plans: plans.length, flagged };
}
