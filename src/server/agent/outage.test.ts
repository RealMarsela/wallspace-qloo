import { describe, expect, it } from "vitest";
import type { Brief, Face, HeatCell, Plan, Run, RunStep } from "@/contract";
import { TokenFactory } from "../models";
import { MemoryStore } from "../db/memory";
import { QlooError } from "../qloo/types";
import { TavilyError, type Tavily } from "../tavily/client";
import { eventsFor } from "../tavily/events";
import { MemoryKv } from "./memory";
import { runPlanPipeline } from "./pipeline";
import type { QlooPort, ScoringPort } from "./ports";
import { directRunner } from "./steps";
import { writeCopy } from "./copy";

// Every test mocks one provider answering 404 (a model missing from Token Factory, as on 30 Oct) or failing, and checks the run goes on.
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const face = (n: number, hood: string, lat: number, lng: number, photoUrl: string | null = null): Face => ({
  id: `ATL-${String(n).padStart(4, "0")}`, name: `Test Ave ${n}`, kind: "bulletin", lat, lng, neighbourhood: hood, readSide: "right", facing: "N", widthFt: 48, heightFt: 14,
  lit: true, digital: false, rateMonthUsd: 4000, ownerId: "own-peachline", photoUrl, photoCredit: null, location: "sample", osmId: null,
});
const faces = (photo: string | null) => [face(1, "West End", 33.736, -84.413, photo), face(2, "West End", 33.7365, -84.4135, photo), face(3, "Midtown", 33.78, -84.383, photo)];

const brief: Brief = {
  id: "brief-1", brandName: "Porchlight Comedy Tour (sample brand)", brandSample: true, audienceText: "people who would go to a comedy club on a Tuesday",
  loves: ["stand-up comedy specials", "90s sitcoms"], seeds: [], city: "atlanta", budgetUsd: 20000, flightStart: "2026-11-16", flightWeeks: 4, brandVoice: null, creativeUrl: null, createdAt: "2026-10-30T00:00:00Z",
};

const heat: HeatCell[] = [{ geohash: "dn5bp", lat: 33.736, lng: -84.413, affinity: 0.9 }, { geohash: "dn5bq", lat: 33.78, lng: -84.383, affinity: 0.7 }];
const okQloo: QlooPort = {
  vocabulary: async () => ({ cached: true, ms: 1, tool: "qloo.tags", data: [{ id: "t1", name: "stand-up comedy", kind: "tag", type: "urn:tag:genre:media" }, { id: "t2", name: "sitcom", kind: "tag", type: "urn:tag:genre:media" }] }),
  search: async (q) => ({ cached: true, ms: 2, tool: "qloo.search", data: { qlooId: `e-${q}`, name: q, type: "urn:entity:tv_show", via: "search", similarity: null } }),
  heatmap: async () => ({ cached: true, ms: 3, tool: "qloo.insights urn:heatmap", data: heat }),
  blockTags: async (f) => ({ cached: true, ms: 1, tool: "qloo.insights urn:tag + signal.location", data: [{ id: "x", name: `live music near ${f.neighbourhood}`, affinity: 0.8 }] }),
  trending: async () => ({ cached: true, ms: 1, tool: "qloo.trending", data: [] }),
};
const scoring: ScoringPort = {
  score: (fs) => fs.map((f, i) => ({ face: f, affinity: 0.9 - i * 0.1, score: 90 - i * 10, hasEvidence: true })),
  split: (cands) => {
    const picks = cands.slice(0, 3);
    return { picks, costs: Object.fromEntries(picks.map((p) => [p.face.id, 6000])), split: [{ neighbourhood: "West End", usd: 12000, share: 0.67 }, { neighbourhood: "Midtown", usd: 6000, share: 0.33 }], spendUsd: 18000 };
  },
};

const LINE = (k: number) => `West End knows joke ${k}`;
type Body = { model: string; tools?: unknown[]; messages: { content: unknown }[] };
// `gone` decides, per request, whether Token Factory answers 404.
function tfWith(gone: (b: Body) => boolean, opts: { chooseOne?: boolean } = {}): { tf: TokenFactory; calls: { model: string; gone: boolean }[] } {
  let lines = 0;
  const calls: { model: string; gone: boolean }[] = [];
  const reply = (content: string, toolCalls?: unknown[]) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content, tool_calls: toolCalls } }], usage: { prompt_tokens: 200, completion_tokens: 30 } }), { status: 200, headers: { "x-request-id": "r1" } });
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as Body;
    const missing = gone(body);
    calls.push({ model: body.model, gone: missing });
    if (missing) return new Response(JSON.stringify({ error: { message: "The model does not exist", code: "model_not_found" } }), { status: 404 });
    if (String(url).endsWith("embeddings")) return new Response(JSON.stringify({ data: (body as unknown as { input: string[] }).input.map((_, index) => ({ index, embedding: index % 2 ? [0, 1, 0] : [1, 0, 0] })), usage: { prompt_tokens: 5 } }), { status: 200 });
    const sys = String(body.messages[0]?.content ?? "");
    if (body.model.includes("Super-VL") && body.tools) {
      if (sys.includes("choosing which candidate faces")) return reply("", [{ id: "i1", type: "function", function: { name: "inspect_site_photo", arguments: JSON.stringify({ faceId: "ATL-0001" }) } }, ...(opts.chooseOne ? [] : [{ id: "i2", type: "function", function: { name: "inspect_site_photo", arguments: JSON.stringify({ faceId: "ATL-0002" }) } }])]);
      return reply("", [{ id: "c1", type: "function", function: { name: "qloo_search", arguments: JSON.stringify({ query: "stand-up comedy specials" }) } }, { id: "c2", type: "function", function: { name: "qloo_heatmap", arguments: "{}" } }]);
    }
    if (body.model.includes("Super-VL")) return reply(JSON.stringify({ sightline: "clear", clutter: "low", faceShareOfFrame: 0.3, note: "Open view." }));
    if (body.model.includes("Ultra")) return reply(JSON.stringify({ flags: [], budgetOk: true, budgetNote: "spend within brief" }));
    if (sys.includes("outdoor advertising lines")) {
      lines += 1;
      return reply(JSON.stringify({ lines: [0, 1, 2].map((k) => ({ text: LINE(lines * 3 + k), rationale: "from block tags" })) }));
    }
    return reply(JSON.stringify({ verdict: "pass", reason: "", suggestion: null }));
  }) as unknown as typeof fetch;
  return { tf: new TokenFactory({ apiKey: "k", fetchImpl, sleep: async () => undefined }), calls };
}

async function run(o: { tf: TokenFactory; qloo?: QlooPort; photo?: boolean; tavily?: Tavily | null }): Promise<{ plan: Plan; run: Run }> {
  return runPlanPipeline(
    { tf: o.tf, qloo: o.qloo ?? okQloo, scoring, faces: faces(o.photo ? PHOTO : null), kv: new MemoryKv(), tavily: o.tavily ?? null, budget: null, store: new MemoryStore(), emit: async () => {}, step: directRunner, sessionId: "s1", bucket: "visitor" },
    { brief, planId: "plan-1", runId: "run-1", sample: false },
  );
}
const skipped = (r: Run, role: RunStep["role"]) => r.steps.filter((s) => s.role === role && s.status === "skipped");
const isModel = (name: string) => (b: Body) => b.model.includes(name);

describe("Token Factory 404 classification", () => {
  it("maps 404 and model_not_found to model_unavailable, leaves other errors alone", async () => {
    const mk = (status: number, error: unknown) => new TokenFactory({ apiKey: "k", sleep: async () => undefined, fetchImpl: (async () => new Response(JSON.stringify({ error }), { status })) as unknown as typeof fetch });
    const ask = (tf: TokenFactory) => tf.chat({ role: "lightning", messages: [{ role: "user", content: "x" }], meta: { title: "t" } }).catch((e) => e);
    expect(await ask(mk(404, "nope"))).toMatchObject({ code: "model_unavailable", status: 404 });
    expect(await ask(mk(400, { code: "model_not_found" }))).toMatchObject({ code: "model_unavailable" });
    expect(await ask(mk(401, "bad key"))).toMatchObject({ code: "upstream", status: 401 });
  });
});

describe("a plan run survives an unavailable provider", () => {
  it("embeddings 404: tag seeds skipped, the planner maps from searched seeds", async () => {
    const { plan, run: r } = await run({ tf: tfWith(isModel("Embedding")).tf });
    expect(plan.status).toBe("ready");
    expect(skipped(r, "embedding")[0]).toMatchObject({ errorCode: "model_unavailable" });
    expect(skipped(r, "embedding")[0].summary).toMatch(/^skipped \(model unavailable\)/);
    expect(plan.heat.length).toBeGreaterThan(0);
    expect(plan.picks).toHaveLength(3);
  });

  it("embeddings 404 and Qloo finds nothing: the run stops with a clear step message, no heatmap call", async () => {
    const qloo = { ...okQloo, search: async () => ({ cached: true, ms: 1, tool: "qloo.search", data: null }) };
    await expect(run({ tf: tfWith(isModel("Embedding")).tf, qloo })).rejects.toMatchObject({ code: "no_seeds", message: expect.stringMatching(/No taste seeds/) });
  });

  it("planner (Super VL) 404: the fixed spine plans the Qloo calls", async () => {
    const { plan, run: r } = await run({ tf: tfWith((b) => b.model.includes("Super-VL")).tf });
    expect(plan.status).toBe("ready");
    const s = skipped(r, "super-vl").find((x) => x.title === "plan the Qloo calls");
    expect(s).toMatchObject({ errorCode: "model_unavailable", model: "nvidia/Nemotron-3.5-Super-VL" });
    expect(r.steps.some((x) => x.title === "fixed spine" && /planner model unavailable/.test(x.summary))).toBe(true);
    expect(plan.heat.length).toBeGreaterThan(0);
  });

  it("photo read 404 on the chooser: every face is kept and marked photo not checked", async () => {
    const f = tfWith((b) => b.model.includes("Super-VL") && String(b.messages[0].content).includes("choosing which candidate faces"));
    const { plan, run: r } = await run({ tf: f.tf, photo: true });
    expect(plan.status).toBe("ready");
    expect(plan.picks).toHaveLength(3);
    expect(plan.picks.every((p) => p.photoRead === null && p.evidence.some((e) => e.kind === "photo-read" && e.label === "photo not checked"))).toBe(true);
    expect(skipped(r, "super-vl").some((x) => x.title === "read site photos" && x.errorCode === "model_unavailable")).toBe(true);
    expect(f.calls.filter((c) => c.gone).length).toBeGreaterThan(0);
  });

  it("photo read 404 mid-way: the unread faces are kept and marked, no other model answers", async () => {
    const f = tfWith((b) => b.model.includes("Super-VL") && !b.tools && Array.isArray(b.messages[1]?.content));
    const { plan, run: r } = await run({ tf: f.tf, photo: true });
    expect(plan.status).toBe("ready");
    const marked = plan.picks.filter((p) => p.evidence.some((e) => e.label === "photo not checked")).map((p) => p.faceId);
    expect(marked).toEqual(expect.arrayContaining(["ATL-0001", "ATL-0002"]));
    expect(skipped(r, "super-vl").some((x) => x.title.startsWith("read the site photo of"))).toBe(true);
    expect(new Set(f.calls.map((c) => c.model)).size).toBeLessThanOrEqual(4); // only the four configured models, never a substitute
  });

  it("Lightning copy 404: the face gets copy needs a human, nothing shipped, run continues", async () => {
    const f = tfWith(isModel("Lightning"));
    const { plan, run: r } = await run({ tf: f.tf });
    expect(plan.status).toBe("ready");
    expect(plan.picks).toHaveLength(3);
    for (const p of plan.picks) {
      expect(p.copy).toHaveLength(0);
      expect(p.review.status).toBe("flagged");
      expect(p.review.note).toMatch(/^Copy needs a human: the copy model was unavailable \(model_unavailable, HTTP 404\)/);
    }
    const errs = r.steps.filter((s) => s.role === "lightning" && s.errorCode === "model_unavailable");
    expect(errs.length).toBe(3); // one attempt per face, no retry or redraft against a missing model
    expect(errs.every((s) => s.status === "error")).toBe(true);
    expect(f.calls.filter((c) => c.model.includes("Lightning")).length).toBe(3);
  });

  it("writeCopy against a missing model makes one call and hands the face to a human", async () => {
    const f = tfWith(isModel("Lightning"));
    const r = await writeCopy(f.tf, { brief, face: { id: "ATL-0001", name: "Test Ave 1", neighbourhood: "West End", kind: "bulletin" }, topTags: [], events: [] });
    expect(f.calls).toHaveLength(1);
    expect(r.lines).toHaveLength(0);
    expect(r.needsHuman).toMatch(/^Copy needs a human/);
  });

  it("Ultra review 404: the plan ships not reviewed", async () => {
    const { plan, run: r } = await run({ tf: tfWith(isModel("Ultra")).tf });
    expect(plan.status).toBe("ready");
    expect(skipped(r, "ultra")[0]).toMatchObject({ errorCode: "model_unavailable", title: "review the whole plan" });
    expect(skipped(r, "ultra")[0].summary).toMatch(/not reviewed/);
    expect(plan.picks.every((p) => p.review.status === "ok" && /^Not reviewed/.test(p.review.note ?? ""))).toBe(true);
    expect(plan.picks.every((p) => p.copy.length === 3)).toBe(true);
  });

  it("Tavily down: no events checked, evidence says so, run continues", async () => {
    const tavily = { search: async () => { throw new TavilyError("Tavily is down", "http"); } } as unknown as Tavily;
    const { plan, run: r } = await run({ tf: tfWith(() => false).tf, tavily });
    expect(plan.status).toBe("ready");
    const s = skipped(r, "tavily");
    expect(s).toHaveLength(2); // West End, Midtown
    expect(s[0]).toMatchObject({ errorCode: "http" });
    expect(s[0].summary).toMatch(/^no events checked/);
    expect(plan.picks.every((p) => p.evidence.some((e) => e.kind === "tavily-event" && e.label === "no events checked"))).toBe(true);
  });

  it("Tavily answers but the triage model (Lightning) is 404: no events checked, skipped (model unavailable)", async () => {
    const tavily = { search: async () => ({ data: [{ url: "https://e.test/a", title: "A", content: "x", score: 0.9 }], requestId: null, ms: 1, cached: false }), extract: async () => ({ data: [], requestId: null, ms: 0, cached: false }) } as unknown as Tavily;
    const r = await eventsFor({ tavily, tf: tfWith(isModel("Lightning")).tf, kv: new MemoryKv(), budget: null, sessionId: "s", bucket: "visitor" }, "Midtown", { start: "2026-11-16", weeks: 4 });
    expect(r.events).toEqual([]);
    expect(r.note).toMatch(/^no events checked: skipped \(model unavailable\)/);
    expect(r.steps.at(-1)).toMatchObject({ status: "skipped", errorCode: "model_unavailable" });
  });

  it("Qloo heatmap down: the run stops with a clear message", async () => {
    const qloo = { ...okQloo, heatmap: async () => { throw new QlooError("Qloo 503", "http", 503); } };
    await expect(run({ tf: tfWith(() => false).tf, qloo })).rejects.toMatchObject({ code: "qloo_unavailable", message: expect.stringMatching(/audience map could not be built \(Qloo http HTTP 503\)/) });
  });

  it("Qloo vocabulary down: tag seeds skipped; block tags down: the block is kept without tag evidence", async () => {
    const down = (m: string) => async () => { throw new QlooError(`Qloo ${m}`, "http", 404); };
    const a = await run({ tf: tfWith(() => false).tf, qloo: { ...okQloo, vocabulary: down("vocabulary") } });
    expect(a.plan.status).toBe("ready");
    expect(skipped(a.run, "qloo")[0]).toMatchObject({ errorCode: "http", title: "map the brief to Qloo tags" });
    const b = await run({ tf: tfWith(() => false).tf, qloo: { ...okQloo, blockTags: down("tags") } });
    expect(b.plan.status).toBe("ready");
    expect(b.plan.picks.every((p) => p.topTags.length === 0)).toBe(true);
    expect(skipped(b.run, "qloo")).toHaveLength(3);
    expect(b.plan.picks.every((p) => p.copy.length > 0)).toBe(true);
  });

  it("Qloo search down: that love is not resolved, the run goes on", async () => {
    const qloo = { ...okQloo, search: async () => { throw new QlooError("Qloo search", "network"); } };
    const { plan, run: r } = await run({ tf: tfWith(() => false).tf, qloo });
    expect(plan.status).toBe("ready");
    expect(skipped(r, "qloo").some((s) => s.errorCode === "network")).toBe(true);
  });
});
