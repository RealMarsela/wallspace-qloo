import { describe, expect, it } from "vitest";
import type { Face } from "@/contract";
import { TokenFactory } from "../models";
import { MemoryKv } from "./memory";
import { resolveAndMap } from "./planner";
import type { QlooPort } from "./ports";
import { cosine, decodeVectors, encodeVectors, matchSeeds } from "./vocab";
import { inspectCandidates } from "./inspect";
import { TavilyBudgetCore, memoryBudget, PREWARM_CAPS } from "../tavily/budget-core";
import { Tavily } from "../tavily/client";
import { eventsFor, eventsCacheKey } from "../tavily/events";
import { MemoryReplayStore, requestKey } from "../models";

const chat = (content: string, toolCalls?: unknown[]) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content, tool_calls: toolCalls } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
const tfWith = (handler: (body: Record<string, unknown>) => Response) => new TokenFactory({ apiKey: "k", fetchImpl: (async (_u: string, init: RequestInit) => handler(JSON.parse(init.body as string))) as unknown as typeof fetch });

const qloo = (calls: string[]): QlooPort => ({
  vocabulary: async () => ({ cached: true, ms: 1, tool: "t", data: [{ id: "a", name: "comedy", kind: "tag", type: "urn:tag:genre:media" }, { id: "b", name: "hip-hop", kind: "tag", type: "urn:tag:genre:music" }, { id: "c", name: "hobbyists", kind: "audience", type: "urn:audience:leisure" }] }),
  search: async (q) => { calls.push(`search:${q}`); return { cached: true, ms: 1, tool: "qloo.search", data: { qlooId: `id-${q}`, name: q, type: "urn:entity:artist", via: "search", similarity: null } }; },
  heatmap: async () => { calls.push("heatmap"); return { cached: true, ms: 1, tool: "qloo.heatmap", data: [{ geohash: "x", lat: 1, lng: 1, affinity: 0.5 }] }; },
  blockTags: async () => ({ cached: true, ms: 1, tool: "t", data: [] }),
  trending: async () => ({ cached: true, ms: 1, tool: "t", data: [] }),
});

describe("vectors", () => {
  it("round-trips through the KV encoding and scores cosine", () => {
    const v = [[1, 0, 0.5], [0, 1, 0]];
    const back = decodeVectors(encodeVectors(v));
    expect(back[0][2]).toBeCloseTo(0.5, 5);
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("matches the brief to the nearest vocabulary entries and builds the vocabulary only once", async () => {
    let embedCalls = 0;
    const tf = tfWith((body) => {
      embedCalls += 1;
      const input = body.input as string[];
      const vec = (s: string) => (s.includes("comedy") || s.includes("laugh") ? [1, 0, 0] : s.includes("hip-hop") ? [0, 1, 0] : [0, 0, 1]);
      return new Response(JSON.stringify({ data: input.map((s, index) => ({ index, embedding: vec(s) })), usage: { prompt_tokens: 3 } }), { status: 200 });
    });
    const kv = new MemoryKv();
    const m1 = await matchSeeds(tf, kv, qloo([]), ["people who love to laugh"], { minSim: 0.5 });
    expect(m1.seeds.map((s) => s.name)).toEqual(["comedy"]);
    expect(m1.seeds[0].via).toBe("embedding");
    expect(m1.steps.map((s) => s.role)).toEqual(["embedding", "embedding"]);
    const before = embedCalls;
    const m2 = await matchSeeds(tf, kv, qloo([]), ["laugh out loud"], { minSim: 0.5 });
    expect(embedCalls - before).toBe(1); // vocabulary came from KV; only the brief was embedded
    expect(m2.steps).toHaveLength(1);
  });
});

describe("planner", () => {
  it("runs the tools the model chooses", async () => {
    const calls: string[] = [];
    const tf = tfWith(() => chat("", [
      { id: "1", type: "function", function: { name: "qloo_search", arguments: '{"query":"stand-up"}' } },
      { id: "2", type: "function", function: { name: "qloo_heatmap", arguments: "{}" } },
    ]));
    const r = await resolveAndMap(tf, qloo(calls), { audienceText: "x", loves: ["a", "b"], city: "atlanta" }, []);
    expect(r.fixedSpine).toBe(false);
    expect(calls).toEqual(["search:stand-up", "heatmap"]);
  });
  it("falls back to the fixed spine after two turns without a tool call, and says so", async () => {
    const calls: string[] = [];
    const r = await resolveAndMap(tfWith(() => chat("I would rather talk.")), qloo(calls), { audienceText: "x", loves: ["a", "b"], city: "atlanta" }, []);
    expect(r.fixedSpine).toBe(true);
    expect(calls).toEqual(["search:a", "search:b", "heatmap"]);
    expect(r.steps.at(-1)?.summary).toMatch(/failed twice/);
  });
});

describe("inspect", () => {
  const face = (id: string, photoUrl: string | null): Face => ({ id, name: id, kind: "bulletin", lat: 1, lng: 1, neighbourhood: "West End", readSide: "right", facing: "N", widthFt: 48, heightFt: 14, lit: true, digital: false, rateMonthUsd: 1, ownerId: "o", photoUrl, photoCredit: null, location: "sample", osmId: null });
  it("skips honestly when no candidate has a photo", async () => {
    const r = await inspectCandidates(tfWith(() => chat("")), [{ face: face("A", null), affinity: 1, score: 1, hasEvidence: true }]);
    expect(r.steps[0].status).toBe("skipped");
  });
  it("reads the chosen photo and drops a face with a blocked sightline", async () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const tf = tfWith((body) => body.tools
      ? chat("", [{ id: "1", type: "function", function: { name: "inspect_site_photo", arguments: '{"faceId":"A"}' } }])
      : chat(JSON.stringify({ sightline: "blocked", clutter: "high", faceShareOfFrame: 0.1, note: "Oak trees hide the face." })));
    const r = await inspectCandidates(tf, [{ face: face("A", png), affinity: 1, score: 1, hasEvidence: true }, { face: face("B", null), affinity: 1, score: 1, hasEvidence: true }]);
    expect(r.reads.A.sightline).toBe("blocked");
    expect(r.dropped.map((d) => d.faceId)).toEqual(["A"]);
  });
});

describe("inspect: partial and small", () => {
  it("drops a partly hidden face that fills under 6% of the frame, keeps a larger one", async () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const mk = (id: string): Face => ({ id, name: id, kind: "bulletin", lat: 1, lng: 1, neighbourhood: "X", readSide: "right", facing: "N", widthFt: 48, heightFt: 14, lit: true, digital: false, rateMonthUsd: 1, ownerId: "o", photoUrl: png, photoCredit: null, location: "sample", osmId: null });
    const run = async (share: number) => inspectCandidates(tfWith((body) => body.tools
      ? chat("", [{ id: "1", type: "function", function: { name: "inspect_site_photo", arguments: '{"faceId":"A"}' } }])
      : chat(JSON.stringify({ sightline: "partial", clutter: "medium", faceShareOfFrame: share, note: "Wires and a tree frame it." }))), [{ face: mk("A"), affinity: 1, score: 1, hasEvidence: true }]);
    expect((await run(0.04)).dropped.map((d) => d.faceId)).toEqual(["A"]);
    expect((await run(0.2)).dropped).toEqual([]);
  });
});

describe("Tavily events", () => {
  const flight = { start: "2026-11-16", weeks: 4 };
  async function replayTavily() {
    const store = new MemoryReplayStore();
    const q = "West End Atlanta events November 2026";
    store.map.set(await requestKey("tavily/search", { query: q, topic: "general", search_depth: "basic", max_results: 6 }), { status: 200, requestId: "t1", ms: 5, body: { results: [{ url: "https://example.org/events", title: "West End events", content: "Nov 21 West End Street Fest", score: 0.9 }] } });
    store.map.set(await requestKey("tavily/extract", { urls: ["https://example.org/events"], extract_depth: "basic", format: "text" }), { status: 200, requestId: "t2", ms: 5, body: { results: [{ url: "https://example.org/events", raw_content: "West End Street Fest 21 Nov 2026. Old news 3 Oct 2026." }] } });
    return new Tavily({ mode: "replay", store });
  }
  const tf = tfWith(() => chat(JSON.stringify({ events: [{ title: "West End Street Fest", date: "2026-11-21", url: "https://example.org/events", nearby: true }, { title: "Old news", date: "2026-10-03", url: "https://example.org/events", nearby: true }, { title: "Far away show", date: "2026-11-22", url: "https://example.org/x", nearby: false }] })));

  it("searches once, keeps dated nearby events inside the flight, and serves the next call from KV", async () => {
    const kv = new MemoryKv();
    const budget = memoryBudget(new TavilyBudgetCore({ get: async () => undefined, put: async () => undefined }));
    const deps = { tavily: await replayTavily(), tf, kv, budget, sessionId: "s", bucket: "prewarm" as const };
    const a = await eventsFor(deps, "West End", flight);
    expect(a.events.map((e) => e.title)).toEqual(["West End Street Fest"]);
    expect(a.found).toBe(3);
    expect(a.steps[0].summary).toBe("Tavily found 3, Nemotron kept 1");
    expect(await kv.get(eventsCacheKey("West End", flight.start))).toBeTruthy();
    const b = await eventsFor({ ...deps, tavily: null }, "West End", flight);
    expect(b.fromCache).toBe(true);
    expect(b.events).toHaveLength(1);
  });
  it("refuses a fourth search in one visitor session and never calls Tavily", async () => {
    const mem = new Map<string, unknown>();
    const core = new TavilyBudgetCore({ get: async <T,>(k: string) => mem.get(k) as T | undefined, put: async <T,>(k: string, v: T) => void mem.set(k, v) });
    const budget = memoryBudget(core);
    for (let i = 0; i < 3; i++) expect((await budget.reserve("sess", 2, "visitor")).ok).toBe(true);
    const fourth = await budget.reserve("sess", 2, "visitor");
    expect(fourth).toMatchObject({ ok: false });
    const r = await eventsFor({ tavily: await replayTavily(), tf, kv: new MemoryKv(), budget, sessionId: "sess", bucket: "visitor" }, "West End", flight);
    expect(r.steps[0].status).toBe("skipped");
    expect(r.events).toEqual([]);
  });
  it("enforces the 10 credit day and total caps", async () => {
    const mem = new Map<string, unknown>();
    const core = new TavilyBudgetCore({ get: async <T,>(k: string) => mem.get(k) as T | undefined, put: async <T,>(k: string, v: T) => void mem.set(k, v) });
    let ok = 0;
    for (let i = 0; i < 8; i++) if ((await core.reserve(`s${i}`, 2)).ok) ok += 1;
    expect(ok).toBe(5); // 5 x 2 = 10 credits a day
    expect((await core.reserve("p", 2, PREWARM_CAPS)).ok).toBe(true);
  });
});

describe("split capped by spend", () => {
  it("keeps every neighbourhood at or under 30% of the spend", async () => {
    const { faces } = await import("@/data/faces");
    const { scoreFaces } = await import("../scoring");
    const { splitCappedBySpend } = await import("./scoring-adapter");
    const heat = faces.slice(0, 40).map((f, i) => ({ geohash: `g${i}`, lat: f.lat, lng: f.lng, affinity: 0.4 + (i % 7) / 12 }));
    const cands = scoreFaces(faces, heat).filter((s) => s.hasEvidence).slice(0, 14);
    const r = splitCappedBySpend(cands, { budgetUsd: 40000, flightWeeks: 4 });
    expect(r.picks.length).toBeGreaterThan(3);
    expect(Math.max(...r.split.map((s) => s.share))).toBeLessThanOrEqual(0.3 + 1e-6);
    expect(r.spendUsd).toBeLessThanOrEqual(40000);
  });
});
