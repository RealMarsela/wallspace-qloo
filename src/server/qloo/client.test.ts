import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../db";
import type { KvLike } from "../db/bindings";
import { QlooClient, newLocalMeter } from "./client";
import { tagsByPlace, search } from "./endpoints";
import { decodeGeohash, encodeGeohash } from "./geohash";
import { normalizeRequest, requestKey } from "./request-key";
import { QlooError } from "./types";

const kv = (): KvLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: async (k) => data.get(k) ?? null, put: async (k, v) => void data.set(k, v), delete: async (k) => void data.delete(k) };
};
const tagBody = { success: true, results: { tags: [{ tag_id: "urn:tag:x", name: "X", query: { affinity: 0.5 } }] } };
const okFetch = (body: unknown = tagBody) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
const live = (over: Partial<ConstructorParameters<typeof QlooClient>[0]> = {}) => new QlooClient({ apiKey: "test-key", localMeter: newLocalMeter(), ...over });

describe("request keys", () => {
  it("ignore parameter order, blanks and undefined, and never include a key", async () => {
    const a = await requestKey("/v2/insights", { b: "2", a: "1", c: undefined, d: "" });
    expect(a).toBe(await requestKey("/v2/insights", { a: "1", b: "2" }));
    expect(a).not.toBe(await requestKey("/v2/insights", { a: "1", b: "3" }));
    expect(normalizeRequest("/x", { q: "  two   words " })).toBe("/x?q=two words");
  });
});

describe("geohash", () => {
  it("round-trips a point inside Atlanta to within a cell", () => {
    const h = encodeGeohash(33.7648, -84.3489, 6);
    expect(h).toHaveLength(6);
    const c = decodeGeohash(h);
    expect(Math.abs(c.lat - 33.7648)).toBeLessThan(0.004);
    expect(Math.abs(c.lng - -84.3489)).toBeLessThan(0.007);
  });
});

describe("live mode", () => {
  it("sends X-Api-Key to the hackathon base, caches by request key, and ledgers cached and live calls", async () => {
    const f = okFetch();
    const cache = kv();
    const store = new MemoryStore();
    const c = live({ kv: cache, store, fetchImpl: f as never });
    await tagsByPlace(c, 33.7648, -84.3489);
    await tagsByPlace(c, 33.7648, -84.3489);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url.startsWith("https://hackathon.api.qloo.com/v2/insights?")).toBe(true);
    expect(decodeURIComponent(url)).toContain("signal.location=POINT(-84.3489+33.7648)"); // lng first, space form-encoded
    expect(init.headers["X-Api-Key"]).toBe("test-key");
    expect([...cache.data.keys()][0]).toMatch(/^qloo:v1:[0-9a-f]{32}$/);
    expect(JSON.stringify([...cache.data.values()])).not.toContain("test-key");
    const rows = await store.listLedger({ provider: "qloo" });
    expect(rows.map((r) => r.cached).sort()).toEqual([false, true]);
    expect(JSON.stringify(rows)).not.toContain("test-key");
  });
  it("refuses past the hard cap before any fetch and ledgers the block", async () => {
    const f = okFetch();
    const store = new MemoryStore();
    const c = live({ fetchImpl: f as never, store, caps: { total: 2, day: 2 } });
    await tagsByPlace(c, 1, 1);
    await tagsByPlace(c, 2, 2);
    await expect(tagsByPlace(c, 3, 3)).rejects.toMatchObject({ code: "cap_reached" });
    expect(f).toHaveBeenCalledTimes(2);
    expect((await store.listLedger()).some((r) => r.status === "blocked")).toBe(true);
  });
  it("does not count a call that never reached Qloo, and surfaces HTTP errors without caching them", async () => {
    const down = vi.fn(async () => { throw new TypeError("offline"); });
    const c = live({ fetchImpl: down as never, caps: { total: 1, day: 1 } });
    await expect(tagsByPlace(c, 5, 5)).rejects.toMatchObject({ code: "network" });
    await expect(tagsByPlace(c, 5, 5)).rejects.toMatchObject({ code: "network" }); // refunded, so still under the cap
    const cache = kv();
    const bad = vi.fn(async () => new Response("no", { status: 403 }));
    const c2 = live({ fetchImpl: bad as never, kv: cache });
    await expect(tagsByPlace(c2, 6, 6)).rejects.toMatchObject({ code: "http", status: 403 });
    expect(cache.data.size).toBe(0);
  });
  it("needs a key", async () => {
    const c = new QlooClient({});
    await expect(search(c, "x")).rejects.toBeInstanceOf(QlooError);
  });
});


describe("live answers", () => {
  it("reports the Qloo request id for a live call and none for a KV copy", async () => {
    const cache = kv();
    const f = vi.fn(async () => new Response(JSON.stringify(tagBody), { status: 200, headers: { "x-qloo-request-id": "9f1c-0001" } }));
    const c = live({ kv: cache, fetchImpl: f as never });
    const first = await tagsByPlace(c, 33.77, -84.36);
    const second = await tagsByPlace(c, 33.77, -84.36);
    expect(first.source).toMatchObject({ mode: "live", cached: false, requestId: "9f1c-0001" });
    expect(second.source).toMatchObject({ cached: true, requestId: null });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("keeps live answers in KV for at least a week", async () => {
    const puts: { ttl?: number }[] = [];
    const cache = { get: async () => null, put: async (_k: string, _v: string, o?: { expirationTtl?: number }) => void puts.push({ ttl: o?.expirationTtl }), delete: async () => undefined };
    await tagsByPlace(live({ kv: cache as never, fetchImpl: okFetch() as never }), 33.77, -84.36);
    expect(puts[0].ttl).toBeGreaterThanOrEqual(7 * 86400);
  });
  it("ignores an unreadable KV copy and calls Qloo", async () => {
    const f = okFetch();
    const cache = { get: async () => JSON.stringify({ not: "a qloo body" }), put: async () => undefined, delete: async () => undefined };
    expect((await tagsByPlace(live({ kv: cache as never, fetchImpl: f as never }), 33.77, -84.36)).source.cached).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("never returns data when Qloo fails: a 500 and a timeout both throw", async () => {
    const c = live({ fetchImpl: vi.fn(async () => new Response("down", { status: 500 })) as never });
    await expect(tagsByPlace(c, 1, 2)).rejects.toMatchObject({ code: "http", status: 500 });
    const t = live({ fetchImpl: vi.fn(async () => { throw new DOMException("timed out", "TimeoutError"); }) as never });
    await expect(tagsByPlace(t, 1, 2)).rejects.toMatchObject({ code: "network" });
  });
});
