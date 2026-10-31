import { describe, expect, it } from "vitest";
import type { Brief, Face, HeatCell } from "@/contract";
import { TokenFactory } from "../models";
import { MemoryStore } from "../db/memory";
import { MemoryKv } from "./memory";
import { runPlanPipeline } from "./pipeline";
import type { QlooPort, ScoringPort } from "./ports";
import { directRunner } from "./steps";

const face = (n: number, hood: string, lat: number, lng: number): Face => ({
  id: `ATL-${String(n).padStart(4, "0")}`, name: `Test Ave ${n}`, kind: "bulletin", lat, lng, neighbourhood: hood, readSide: "right", facing: "N", widthFt: 48, heightFt: 14,
  lit: true, digital: false, rateMonthUsd: 4000, ownerId: "own-peachline", photoUrl: null, photoCredit: null, location: "sample", osmId: null,
});
const faces = [face(1, "West End", 33.736, -84.413), face(2, "West End", 33.7365, -84.4135), face(3, "Midtown", 33.78, -84.383), face(4, "Buckhead", 33.84, -84.38)];

const brief: Brief = {
  id: "brief-1", brandName: "Porchlight Comedy Tour (sample brand)", brandSample: true, audienceText: "people who would go to a comedy club on a Tuesday",
  loves: ["stand-up comedy specials", "90s sitcoms"], seeds: [], city: "atlanta", budgetUsd: 20000, flightStart: "2026-11-16", flightWeeks: 4, brandVoice: null, creativeUrl: null, createdAt: "2026-10-30T00:00:00Z",
};

const qloo: QlooPort = {
  vocabulary: async () => ({ cached: true, ms: 1, tool: "qloo.tags", data: [{ id: "t1", name: "stand-up comedy", kind: "tag", type: "urn:tag:genre:media" }, { id: "t2", name: "sitcom", kind: "tag", type: "urn:tag:genre:media" }] }),
  search: async (q) => ({ cached: true, ms: 2, tool: "qloo.search", data: { qlooId: `e-${q}`, name: q, type: "urn:entity:tv_show", via: "search", similarity: null } }),
  heatmap: async () => ({ cached: true, ms: 3, tool: "qloo.insights urn:heatmap", data: [{ geohash: "dn5bp", lat: 33.736, lng: -84.413, affinity: 0.9 }, { geohash: "dn5bq", lat: 33.78, lng: -84.383, affinity: 0.7 }] satisfies HeatCell[] }),
  blockTags: async (f) => ({ cached: true, ms: 1, tool: "qloo.insights urn:tag + signal.location", data: [{ id: "x", name: `live music near ${f.neighbourhood}`, affinity: 0.8 }] }),
  trending: async () => ({ cached: true, ms: 1, tool: "qloo.trending", data: [] }),
};

const scoring: ScoringPort = {
  score: (fs) => fs.map((f, i) => ({ face: f, affinity: 0.9 - i * 0.1, score: 90 - i * 10, hasEvidence: f.neighbourhood !== "Buckhead" })).sort((a, b) => b.score - a.score),
  split: (cands) => {
    const picks = cands.slice(0, 3);
    const costs = Object.fromEntries(picks.map((p) => [p.face.id, 6000]));
    return { picks, costs, split: [{ neighbourhood: "West End", usd: 12000, share: 0.67 }, { neighbourhood: "Midtown", usd: 6000, share: 0.33 }], spendUsd: 18000 };
  },
};

function tfFor(onLine: (n: number) => string): TokenFactory {
  let lineCall = 0;
  const reply = (content: string, toolCalls?: unknown[]) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content, tool_calls: toolCalls } }], usage: { prompt_tokens: 200, completion_tokens: 30 } }), { status: 200, headers: { "x-request-id": "r1" } });
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    if (String(url).endsWith("embeddings")) return new Response(JSON.stringify({ data: body.input.map((_: string, index: number) => ({ index, embedding: index % 2 ? [0, 1, 0] : [1, 0, 0] })), usage: { prompt_tokens: 5 } }), { status: 200 });
    const sys = String(body.messages[0]?.content ?? "");
    if (body.model.includes("Super-VL") && body.tools) {
      return reply("", [
        { id: "c1", type: "function", function: { name: "qloo_search", arguments: JSON.stringify({ query: "stand-up comedy specials" }) } },
        { id: "c2", type: "function", function: { name: "qloo_heatmap", arguments: "{}" } },
      ]);
    }
    if (body.model.includes("Ultra")) return reply(JSON.stringify({ flags: [{ faceId: "ATL-0001", issue: "clash", note: "same line as ATL-0002" }], budgetOk: true, budgetNote: "spend within brief" }));
    if (sys.includes("taste-only") || sys.includes("outdoor advertising lines")) {
      lineCall += 1;
      return reply(JSON.stringify({ lines: [0, 1, 2].map((k) => ({ text: onLine(lineCall * 3 + k), rationale: "from block tags" })) }));
    }
    return reply(JSON.stringify({ verdict: "pass", reason: "", suggestion: null }));
  }) as unknown as typeof fetch;
  return new TokenFactory({ apiKey: "k", fetchImpl });
}

describe("plan pipeline", () => {
  it("runs the spine end to end: steps, picks with copy, Ultra flag and redraft", async () => {
    const emitted: string[] = [];
    const store = new MemoryStore();
    const { plan, run } = await runPlanPipeline(
      { tf: tfFor((n) => `West End knows ${n}`), qloo, scoring, faces, kv: new MemoryKv(), tavily: null, budget: null, store, emit: async (s) => void emitted.push(s.id), step: directRunner, sessionId: "s1", bucket: "visitor" },
      { brief, planId: "plan-1", runId: "run-1", sample: false },
    );
    expect(plan.status).toBe("ready");
    expect(plan.picks).toHaveLength(3);
    expect(plan.scoredCount).toBe(4);
    expect(plan.droppedCount).toBe(1); // Buckhead has no evidence
    expect(plan.picks.every((p) => p.copy.length === 3 && p.copy.every((l) => l.guard.status === "pass"))).toBe(true);
    const flagged = plan.picks.find((p) => p.faceId === "ATL-0001");
    expect(flagged?.review.status).toBe("redrafted");
    expect(plan.picks.find((p) => p.faceId === "ATL-0003")?.review.status).toBe("ok");
    expect(plan.picks[0].evidence.some((e) => e.kind === "qloo-heatmap")).toBe(true);
    expect(run.status).toBe("done");
    const roles = new Set(run.steps.map((s) => s.role));
    for (const r of ["live-guard", "embedding", "super-vl", "qloo", "lightning", "ultra"] as const) expect(roles.has(r)).toBe(true);
    expect(new Set(emitted).size).toBe(emitted.length); // ids are unique
    expect(await store.getPlan("plan-1")).toBeTruthy();
  });

  it("never ships a fragment: faces whose copy keeps failing the complete-phrase check are flagged for a human", async () => {
    const { plan, run } = await runPlanPipeline(
      { tf: tfFor((n) => `Catch the ${n % 2 ? "" : "and"}`.trim()), qloo, scoring, faces, kv: new MemoryKv(), tavily: null, budget: null, store: new MemoryStore(), emit: async () => {}, step: directRunner, sessionId: "s1", bucket: "visitor" },
      { brief, planId: "plan-2", runId: "run-2", sample: false },
    );
    expect(plan.status).toBe("ready");
    expect(plan.picks.every((p) => p.copy.length === 0)).toBe(true);
    expect(plan.picks.every((p) => p.review.status === "flagged" && /^.*Copy needs a human/.test(p.review.note ?? ""))).toBe(true);
    expect(run.steps.filter((s) => s.role === "lightning" && s.status === "error").length).toBeGreaterThanOrEqual(9); // every rejected attempt stays in the trace
  });

  it("stops at the guard when the brief targets identity", async () => {
    await expect(runPlanPipeline(
      { tf: tfFor(() => "x"), qloo, scoring, faces, kv: new MemoryKv(), tavily: null, budget: null, store: new MemoryStore(), emit: async () => {}, step: directRunner, sessionId: "s", bucket: "visitor" },
      { brief: { ...brief, audienceText: "reach Black men 25-40" }, planId: "p", runId: "r", sample: false },
    )).rejects.toMatchObject({ code: "guard_blocked" });
  });
});
