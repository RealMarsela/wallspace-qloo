import { describe, expect, it } from "vitest";
import type { CopyLine, Pick, Plan } from "@/contract";
import { MemoryStore } from "../db/memory";
import { bearerOk, safeEqual } from "./http";
import { planCsv } from "./csv";
import { ingestNemo, nemoQueue, signOffPlan } from "./signoff";

const line = (text: string): CopyLine => ({ text, rationale: "r", guard: { status: "pass", engine: "live-guard", reasons: [], suggestion: null }, nemo: null });
const pick = (faceId: string, texts: string[]): Pick => ({ faceId, rank: 1, affinity: 0.9, score: 90, costUsd: 5000, topTags: ["live comedy"], evidence: [], photoRead: null, events: [], copy: texts.map(line), chosenCopy: 0, review: { status: "ok", note: null }, tasteShifted: false });
const plan = (id: string, picks: Pick[]): Plan => ({ id, briefId: "b", runId: "r", status: "ready", picks, scoredCount: 10, droppedCount: 1, spendUsd: 5000, split: [], heat: [], nemoJobId: null, lastRescanAt: null, createdAt: "2026-10-30T00:00:00Z", sample: false });

describe("sign-off and the NeMo queue", () => {
  it("live-guards every line, queues the plan, and the queue lists all lines", async () => {
    const store = new MemoryStore();
    await store.putPlan(plan("p1", [pick("ATL-0001", ["West End knows the punchline.", "Laugh louder, Atlanta.", "Tuesday needs a comedian."]), pick("ATL-0002", ["Little Five laughs louder.", "Vinyl and stand-up.", "Open mic, open ears."])]));
    const r = await signOffPlan(store, "p1");
    expect(r?.queuedLines).toBe(6);
    expect(r?.plan.status).toBe("awaiting-nemo");
    expect(await nemoQueue(store)).toHaveLength(6);
    expect((await store.listSignoffs("p1")).every((s) => s.engine === "live-guard")).toBe(true);
  });
  it("catches a bad line at sign-off even if it slipped through earlier", async () => {
    const store = new MemoryStore();
    await store.putPlan(plan("p2", [pick("ATL-0001", ["Laughter cures anxiety.", "ok line one.", "ok line two."])]));
    const r = await signOffPlan(store, "p2");
    expect(r?.plan.picks[0].copy[0].guard.status).toBe("blocked");
  });
  it("ingesting sign-off results stamps the plan and redrafts a blocked line", async () => {
    const store = new MemoryStore();
    await store.putPlan(plan("p3", [pick("ATL-0001", ["a one.", "b two.", "c three."])]));
    await signOffPlan(store, "p3");
    const verdict = (status: "pass" | "blocked") => ({ status, engine: "nemo-guardrails" as const, reasons: status === "blocked" ? ["identity"] : [], suggestion: null });
    const out = await ingestNemo(store, {
      jobId: "wallspace-nemo-sign-off-1", mode: "sign-off",
      results: [0, 1, 2].map((i) => ({ planId: "p3", faceId: "ATL-0001", lineIndex: i, text: "x", verdict: verdict(i === 1 ? "blocked" : "pass") })),
      stats: { checked: 3, blocked: 1, falsePositives: null },
    }, async () => ["new one.", "new two.", "new three."].map(line));
    expect(out.plansUpdated).toBe(1);
    const p = await store.getPlan("p3");
    expect(p?.status).toBe("nemo-checked");
    expect(p?.nemoJobId).toBe("wallspace-nemo-sign-off-1");
    expect(p?.picks[0].copy[1].text).toBe("new two.");
    expect(p?.picks[0].copy[1].nemo?.status).toBe("rewritten");
  });
  it("red-team results write catch and false-positive rates", async () => {
    const store = new MemoryStore();
    await ingestNemo(store, { jobId: "j", mode: "red-team", results: [], stats: { checked: 40, blocked: 25, falsePositives: 1 } });
    const m = await store.getMetric<{ catchRate: number; falsePositiveRate: number }>("nemo.stats");
    expect(m?.value.catchRate).toBe(1); // (25 - 1) / 24
    expect(m?.value.falsePositiveRate).toBe(0.063); // 1 / 16, rounded to 3 places
  });
});

describe("auth and csv", () => {
  it("compares secrets in constant time and rejects bad bearer headers", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    const req = (h?: string) => new Request("https://x", { headers: h ? { authorization: h } : {} });
    expect(bearerOk(req("Bearer s3cret"), "s3cret")).toBe(true);
    expect(bearerOk(req("Bearer nope"), "s3cret")).toBe(false);
    expect(bearerOk(req(), "s3cret")).toBe(false);
    expect(bearerOk(req("Bearer s3cret"), undefined)).toBe(false);
  });
  it("exports a quoted, formula-safe CSV", () => {
    const csv = planCsv(plan("p", [pick("ATL-0001", ['He said "hi", twice.', "=SUM(A1)", "plain"])]), []);
    expect(csv.split("\r\n")[0]).toContain("chosen_line");
    expect(csv).toContain('"He said ""hi"", twice."');
    expect(csv).toContain("'=SUM(A1)");
  });
});
