import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TokenFactory, chatJson, extractJson, costUsd, MemoryReplayStore, requestKey } from "./index";

function fakeFetch(replies: unknown[], seen: { body: Record<string, unknown> }[] = []): typeof fetch {
  let i = 0;
  return (async (_url: string, init: RequestInit) => {
    seen.push({ body: JSON.parse(init.body as string) });
    const body = replies[Math.min(i++, replies.length - 1)];
    return new Response(JSON.stringify(body), { status: 200, headers: { "x-request-id": `req-${i}` } });
  }) as unknown as typeof fetch;
}

const completion = (content: string, usage = { prompt_tokens: 100, completion_tokens: 20, prompt_cache_hit_tokens: 0 }) => ({
  choices: [{ finish_reason: "stop", message: { content } }],
  usage,
});

describe("cost", () => {
  it("prices Lightning, Ultra and cached tokens per million", () => {
    expect(costUsd("lightning", 1_000_000, 0, 1_000_000)).toBeCloseTo(0.3, 6);
    expect(costUsd("ultra", 1_000_000, 0, 1_000_000)).toBeCloseTo(4, 6);
    expect(costUsd("superVl", 1_000_000, 500_000, 0)).toBeCloseTo(0.15 + 0.03, 6);
    expect(costUsd("embed", 1_000_000, 0, 0)).toBeCloseTo(0.01, 6);
  });
});

describe("extractJson", () => {
  it("takes the last JSON object and ignores thinking and fences", () => {
    expect(extractJson('<think>maybe {"a":1}</think>```json\n{"line":"hi {there}"}\n```')).toEqual({ line: "hi {there}" });
    expect(extractJson('Here {"x":1} then {"y":[1,2]}')).toEqual({ y: [1, 2] });
  });
  it("throws when there is none", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("TokenFactory.chat", () => {
  it("returns a RunStep with model, tokens, cost and request id; sends reasoning off for Lightning", async () => {
    const seen: { body: Record<string, unknown> }[] = [];
    const tf = new TokenFactory({ apiKey: "k", fetchImpl: fakeFetch([completion("hello")], seen) });
    const r = await tf.chat({ role: "lightning", messages: [{ role: "user", content: "x" }], meta: { title: "t" } });
    expect(r.content).toBe("hello");
    expect(r.step).toMatchObject({ role: "lightning", model: "nvidia/Nemotron-3_5-Lightning", tokensIn: 100, tokensOut: 20, requestId: "req-1", status: "ok", cached: false });
    expect(r.step.costUsd).toBeGreaterThan(0);
    expect(seen[0].body.reasoning_effort).toBe("none");
    expect(seen[0].body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });
  it("leaves thinking on for Ultra by default", async () => {
    const seen: { body: Record<string, unknown> }[] = [];
    const tf = new TokenFactory({ apiKey: "k", fetchImpl: fakeFetch([completion("ok")], seen) });
    await tf.chat({ role: "ultra", messages: [{ role: "user", content: "x" }], meta: { title: "t" } });
    expect(seen[0].body.reasoning_effort).toBeUndefined();
  });
  it("refuses to call without a key", async () => {
    const tf = new TokenFactory({ fetchImpl: fakeFetch([]) });
    await expect(tf.chat({ role: "lightning", messages: [], meta: { title: "t" } })).rejects.toMatchObject({ code: "no_key" });
  });
  it("retries once on 429 then succeeds", async () => {
    let n = 0;
    const f = (async () => (n++ === 0 ? new Response("{}", { status: 429 }) : new Response(JSON.stringify(completion("fine")), { status: 200 }))) as unknown as typeof fetch;
    const tf = new TokenFactory({ apiKey: "k", fetchImpl: f, sleep: async () => {} });
    expect((await tf.chat({ role: "lightning", messages: [], meta: { title: "t" } })).content).toBe("fine");
  });
});

describe("chatJson", () => {
  const Schema = z.object({ line: z.string() });
  it("retries once on invalid output and reports both attempts", async () => {
    const tf = new TokenFactory({ apiKey: "k", fetchImpl: fakeFetch([completion("not json"), completion('{"line":"ok"}')]) });
    const r = await chatJson(tf, { role: "lightning", messages: [{ role: "user", content: "x" }], meta: { title: "t" } }, Schema);
    expect(r.value.line).toBe("ok");
    expect(r.steps.map((s) => s.status)).toEqual(["error", "ok"]);
  });
  it("throws bad_json after two failures", async () => {
    const tf = new TokenFactory({ apiKey: "k", fetchImpl: fakeFetch([completion("{}"), completion("{}")]) });
    await expect(chatJson(tf, { role: "lightning", messages: [], meta: { title: "t" } }, Schema)).rejects.toMatchObject({ code: "bad_json" });
  });
});

describe("replay mode", () => {
  it("serves recorded responses, marks them cached, and never calls fetch", async () => {
    const messages = [{ role: "user" as const, content: "x" }];
    const body = { model: "nvidia/Nemotron-3_5-Lightning", messages, max_tokens: 800, temperature: 0.2, reasoning_effort: "none", chat_template_kwargs: { enable_thinking: false } };
    const key = await requestKey("chat/completions", body);
    const store = new MemoryReplayStore({ [key]: { status: 200, body: completion("recorded"), requestId: "rec-1", ms: 321 } });
    const tf = new TokenFactory({ mode: "replay", store, fetchImpl: (() => { throw new Error("fetch called"); }) as unknown as typeof fetch });
    const r = await tf.chat({ role: "lightning", messages, meta: { title: "t" } });
    expect(r.content).toBe("recorded");
    expect(r.step).toMatchObject({ cached: true, requestId: "rec-1", ms: 321 });
  });
  it("fails loudly on a miss", async () => {
    const tf = new TokenFactory({ mode: "replay", store: new MemoryReplayStore() });
    await expect(tf.chat({ role: "lightning", messages: [], meta: { title: "t" } })).rejects.toMatchObject({ code: "replay_miss" });
  });
});
