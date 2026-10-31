// Regenerates copy only for the faces of a stored plan whose lines fail the validator, on PRODUCTION D1, with live Token Factory.
// Nothing else in the plan changes (picks, totals, evidence, heat, run steps). Model attempts are appended to the plan's run as RunSteps,
// the plan goes back to "ready" with no NeMo job id (the changed lines need a new sign-off: scripts/signoff-plan.sh).
//   scripts/regen-copy.sh [planId] [--dry-run]       (default plan-sample)
import { Plan, type RunStep } from "../src/contract/domain";
import { tokenFactoryFor } from "../src/server/agent/env";
import { checkLine } from "../src/server/agent/copy-check";
import { writeCopy } from "../src/server/agent/copy";
import { sumCost } from "../src/server/agent/steps";
import { D1Store } from "../src/server/db/d1";
import { faces } from "../src/data/faces";
import { remoteD1 } from "./_d1-remote";

const say = (s: string) => process.stdout.write(s + "\n");
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const planId = args.find((a) => !a.startsWith("--")) ?? "plan-sample";

const store = new D1Store(remoteD1);
const plan = await store.getPlan(planId);
if (!plan) throw new Error(`plan ${planId} not found`);
const brief = await store.getBrief(plan.briefId);
const run = await store.getRun(plan.runId);
if (!brief || !run) throw new Error("brief or run missing");

const affected = plan.picks.filter((p) => p.copy.some((l) => !checkLine(l.text).ok));
say(`${planId}: ${affected.length} affected face(s): ${affected.map((p) => p.faceId).join(", ") || "none"}`);
if (!affected.length || dry) process.exit(0);

const tf = tokenFactoryFor({ ...process.env, TF_MODE: "live" } as Record<string, string>);
if (!tf) throw new Error("NEBIUS_API_KEY is not set (run through scripts/regen-copy.sh)");

const newSteps: RunStep[] = [];
const picks = [...plan.picks];
for (const p of affected) {
  const face = faces.find((f) => f.id === p.faceId);
  if (!face) throw new Error(`face ${p.faceId} not in inventory`);
  const avoid = plan.picks.filter((o) => o.faceId !== p.faceId).map((o) => o.copy[o.chosenCopy]?.text).filter((t): t is string => !!t);
  const r = await writeCopy(tf, { brief, face, topTags: p.topTags, events: p.events, avoid });
  r.steps.forEach((s, i) => newSteps.push({ ...s, id: `${run.id}:copyfix-${p.faceId}.${i}`, summary: s.summary || p.faceId }));
  say(`${p.faceId}\n  old: ${p.copy.map((l) => JSON.stringify(l.text)).join(" | ")}\n  new: ${r.lines.map((l) => JSON.stringify(l.text)).join(" | ") || "(none)"}${r.needsHuman ? `\n  ${r.needsHuman}` : ""}`);
  for (const s of r.steps) say(`  step ${s.status} ${s.title} request ${s.requestId ?? "-"} $${(s.costUsd ?? 0).toFixed(5)}`);
  const idx = picks.findIndex((x) => x.faceId === p.faceId);
  picks[idx] = { ...p, copy: r.lines, chosenCopy: 0, review: r.needsHuman ? { status: "flagged", note: r.needsHuman } : p.review };
}

const next = Plan.parse({ ...plan, picks, status: "ready", nemoJobId: null });
await store.putPlan(next);
for (const s of newSteps) await store.appendStep(run.id, s);
await store.putRun({ id: run.id, planId: run.planId, kind: run.kind, status: run.status, costUsd: Math.round((run.costUsd + sumCost(newSteps)) * 1e6) / 1e6, startedAt: run.startedAt, endedAt: run.endedAt });
say(`plan ${planId} updated: ${affected.length} face(s), ${newSteps.length} step(s) appended to ${run.id}, status ready (needs a NeMo sign-off)`);
