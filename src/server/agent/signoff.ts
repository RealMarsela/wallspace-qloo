import { z } from "zod";
import type { CopyLine, GuardVerdict, Plan } from "@/contract";
import { NemoIngestRequest } from "@/contract";
import { guardText } from "../guard";
import type { Store } from "../db/types";

type Ingest = z.infer<typeof NemoIngestRequest>;

export interface QueueItem {
  planId: string;
  faceId: string | null;
  lineIndex: number | null;
  text: string;
}

const rowId = (planId: string | null, faceId: string | null, i: number | null, engine: string) => `${planId ?? "-"}:${faceId ?? "-"}:${i ?? "-"}:${engine}`;

// "Sign off for print": the live guard re-checks every line now, then the plan waits for the NeMo job.
export async function signOffPlan(store: Store, planId: string): Promise<{ plan: Plan; queuedLines: number } | null> {
  const plan = await store.getPlan(planId);
  if (!plan) return null;
  let queued = 0;
  const picks = [];
  for (const p of plan.picks) {
    const copy: CopyLine[] = [];
    for (const [i, line] of p.copy.entries()) {
      const g = await guardText(line.text, { kind: "copy" });
      await store.addSignoff({ id: rowId(planId, p.faceId, i, "live-guard"), planId, faceId: p.faceId, lineIndex: i, engine: "live-guard", status: g.verdict.status, text: line.text, json: g.verdict, createdAt: new Date().toISOString() });
      copy.push({ ...line, guard: g.verdict });
      queued += 1;
    }
    picks.push({ ...p, copy });
  }
  const next: Plan = { ...plan, picks, status: "awaiting-nemo" };
  await store.putPlan(next);
  return { plan: next, queuedLines: queued };
}

// Lines of every plan that is waiting for the NeMo job.
export async function nemoQueue(store: Store): Promise<QueueItem[]> {
  const plans = (await store.listPlans(200)).filter((p) => p.status === "awaiting-nemo");
  return plans.flatMap((p) => p.picks.flatMap((pick) => pick.copy.map((l, i) => ({ planId: p.id, faceId: pick.faceId, lineIndex: i, text: l.text }))));
}

export type Redraft = (planId: string, faceId: string, blockedReasons: string[]) => Promise<CopyLine[] | null>;

export async function ingestNemo(store: Store, body: Ingest, redraft?: Redraft): Promise<{ stored: number; plansUpdated: number }> {
  const at = new Date().toISOString();
  for (const r of body.results) {
    await store.addSignoff({ id: `${body.jobId}:${rowId(r.planId, r.faceId, r.lineIndex, "nemo")}:${r.lineIndex ?? 0}:${Math.abs(hash(r.text))}`, planId: r.planId ?? "-", faceId: r.faceId, lineIndex: r.lineIndex, engine: "nemo-guardrails", status: r.verdict.status, text: r.text, json: r.verdict, createdAt: at });
  }
  if (body.mode === "red-team") {
    // The job's red-team set is 60% identity attempts and 40% legitimate taste prompts (24 and 16 of 40).
    const { checked, blocked, falsePositives } = body.stats;
    const attacks = Math.round(checked * 0.6);
    const legit = checked - attacks;
    await store.setMetric("nemo.stats", {
      jobId: body.jobId, checked, blocked, falsePositives, at,
      catchRate: falsePositives === null || !attacks ? null : round((blocked - falsePositives) / attacks),
      falsePositiveRate: falsePositives === null || !legit ? null : round(falsePositives / legit),
    });
    return { stored: body.results.length, plansUpdated: 0 };
  }
  // sign-off: attach each verdict to its line; a blocked line is redrafted and re-checked by the live guard.
  const byPlan = new Map<string, Ingest["results"]>();
  for (const r of body.results) if (r.planId) byPlan.set(r.planId, [...(byPlan.get(r.planId) ?? []), r]);
  let updated = 0;
  for (const [planId, rows] of byPlan) {
    const plan = await store.getPlan(planId);
    if (!plan) continue;
    const picks = [];
    for (const p of plan.picks) {
      let copy = p.copy.map((l, i) => {
        const hit = rows.find((r) => r.faceId === p.faceId && r.lineIndex === i);
        return hit ? { ...l, nemo: hit.verdict as GuardVerdict } : l;
      });
      const blocked = copy.flatMap((l) => (l.nemo?.status === "blocked" ? l.nemo.reasons : []));
      if (blocked.length && redraft) {
        const fresh = await redraft(planId, p.faceId, blocked).catch(() => null);
        if (fresh) copy = fresh.map((l, i) => ({ ...l, nemo: { status: "rewritten" as const, engine: "nemo-guardrails" as const, reasons: copy[i]?.nemo?.reasons ?? blocked, suggestion: null }, guard: l.guard }));
      }
      picks.push({ ...p, copy });
    }
    await store.putPlan({ ...plan, picks, status: "nemo-checked", nemoJobId: body.jobId });
    updated += 1;
  }
  return { stored: body.results.length, plansUpdated: updated };
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const round = (n: number) => Math.round(n * 1000) / 1000;
