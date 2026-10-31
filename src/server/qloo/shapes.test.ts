import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../db";
import { QlooClient, newLocalMeter } from "./client";
import { cityTags, explain, heatmap, search, tags, tagsByPlace } from "./endpoints";
import { liftAgainstCity, ninesScore, rankTags } from "./lift";
import { fakeQloo, type Route } from "./test-client";
import type { QlooTag } from "./types";

// Bodies below copy the SHAPES of real responses observed on 30 Oct 2026 (qloo-probe/SHAPES.md), with invented values.
type Params = NonNullable<Route["match"]>;
const rec = (_kind: string, endpoint: string, params: Params, body: unknown): Route => ({ endpoint, match: params, body });
const replayOf = async (...routes: Route[]) => fakeQloo(routes).client;

describe("observed response shapes", () => {
  it("/search answers a bare results array with types[] and no success flag", async () => {
    const c = await replayOf(rec("search", "/search", { query: "90s sitcoms", types: "urn:entity:tv_show", take: 3 }, {
      results: [{ name: "Moesha Reunion", entity_id: "0D7FD186-0207-40BF-8AF1-0FD79ADA63E6", types: ["urn:entity:tv_show"], popularity: 0.91, disambiguation: "1996" }],
    }));
    const r = await search(c, "90s sitcoms", { types: "urn:entity:tv_show", take: 3 });
    expect(r.data).toEqual([{ id: "0D7FD186-0207-40BF-8AF1-0FD79ADA63E6", name: "Moesha Reunion", types: ["urn:entity:tv_show"], popularity: 0.91 }]);
  });

  it("the /v2/tags list uses id and type; tag insights use tag_id and subtype", async () => {
    const list = rec("tags", "/v2/tags", { "filter.tag.types": "urn:tag:genre:media", take: 100 }, {
      success: true, results: { tags: [{ id: "urn:tag:genre:media:comedy", name: "Comedy", type: "urn:tag:genre:media", popularity: 0.99, parents: [{ type: "urn:entity:tv_show" }], properties: {}, tags: [] }] },
    });
    const block = rec("tags-by-place", "/v2/insights", { "filter.type": "urn:tag", "signal.location": "POINT(-84.39 33.78)", take: 50 }, {
      success: true, results: { tags: [{ tag_id: "urn:tag:ambience:qloo:lively", name: "Lively", types: ["urn:entity:place"], subtype: "urn:tag:ambience:qloo", tag_value: "x", popularity: 0.99, query: { affinity: 0.9997 } }] },
      query: { geospatial: { panel_size: { context: 965584204, target: 10585962 } } },
    });
    const c = await replayOf(list, block);
    expect((await tags(c, { types: "urn:tag:genre:media", take: 100 })).data[0]).toMatchObject({ id: "urn:tag:genre:media:comedy", type: "urn:tag:genre:media", affinity: null, popularity: 0.99 });
    expect((await tagsByPlace(c, 33.78, -84.39)).data[0]).toMatchObject({ id: "urn:tag:ambience:qloo:lively", type: "urn:tag:ambience:qloo", affinity: 0.9997 });
  });

  it("an empty tag list is a 200, not an error", async () => {
    const c = await replayOf(rec("tags-by-place", "/v2/insights", { "filter.type": "urn:tag", "signal.location": "POINT(-84.4 33.7)", take: 50 }, { success: true, results: { tags: [] }, query: { geospatial: { panel_size: {} } } }));
    expect((await tagsByPlace(c, 33.7, -84.4)).data).toEqual([]);
  });

  it("a city locality query sends signal.location.query and no radius", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ success: true, results: { tags: [] } }), { status: 200 }));
    const c = new QlooClient({ apiKey: "k", localMeter: newLocalMeter(), fetchImpl: f as never });
    await cityTags(c, "Atlanta", { take: 50 });
    const url = decodeURIComponent((f.mock.calls[0] as unknown as [string])[0]);
    expect(url).toContain("signal.location.query=Atlanta");
    expect(url).not.toContain("radius");
    expect(url).not.toContain("bias.trends");
  });

  it("heatmap cells carry a 7-character geohash, latitude/longitude and extra query fields", async () => {
    const c = await replayOf(rec("heatmap", "/v2/insights", { "filter.type": "urn:heatmap", "filter.location": "POLYGON((-84.55 33.65,-84.29 33.65,-84.29 33.89,-84.55 33.89,-84.55 33.65))", "signal.interests.tags": "urn:tag:genre:media:comedy" }, {
      success: true, results: { heatmap: [{ location: { latitude: 33.75618, longitude: -84.38942, geohash: "dn5bp9j" }, query: { affinity: 1, affinity_rank: 0.69, popularity: 1, entity_tv_show_affinity_rank: null, tag_affinity_rank: 0.98, entity_tv_show_affinity: null, tag_affinity: 1 } }] },
    }));
    const r = await heatmap(c, { tagIds: ["urn:tag:genre:media:comedy"] });
    expect(r.data).toEqual([{ geohash: "dn5bp9j", lat: 33.75618, lng: -84.38942, affinity: 1 }]);
  });

  it("explainability gives ids and scores only; names come from the anchor list", async () => {
    const params = { "filter.type": "urn:entity:brand", "signal.interests.entities": "AAAA0001,BBBB0002", "signal.location": "POINT(-84.39 33.78)", "feature.explainability": true, take: 5 };
    const c = await replayOf(rec("explain", "/v2/insights", params, {
      success: true, results: { entities: [{ entity_id: "F1", name: "Monday Night Brewing", subtype: "urn:entity:brand", query: { affinity: 0.99, measurements: { audience_growth: 0 }, explainability: { "signal.interests.entities": [{ entity_id: "aaaa0001", score: 0.7 }, { entity_id: "BBBB0002", score: 0.3 }] } } }] },
    }));
    const r = await explain(c, [{ id: "AAAA0001", name: "That '90s Show" }, { id: "BBBB0002", name: "Comedy" }], 33.78, -84.39);
    expect(r.data[0].because).toEqual([{ anchorId: "aaaa0001", name: "That '90s Show", score: 0.7 }, { anchorId: "BBBB0002", name: "Comedy", score: 0.3 }]);
  });

  it("maps a 400 { errors } body to a bad_request error that is ledgered and not cached", async () => {
    const body = { errors: [{ message: "take must be an integer value between 1 and 50", path: "take" }] };
    const f = vi.fn(async () => new Response(JSON.stringify(body), { status: 400 }));
    const store = new MemoryStore();
    const kv = new Map<string, string>();
    const c = new QlooClient({ apiKey: "k", localMeter: newLocalMeter(), fetchImpl: f as never, store, kv: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v), delete: async () => undefined } });
    await expect(tagsByPlace(c, 1, 1, { take: 100 })).rejects.toMatchObject({ code: "bad_request", status: 400, message: expect.stringContaining("take must be an integer") });
    expect(kv.size).toBe(0);
    expect((await store.listLedger({ provider: "qloo" }))[0]).toMatchObject({ status: "error" });
  });
});

const tag = (id: string, type: string, affinity: number): QlooTag => ({ id, name: id.split(":").pop() as string, type, affinity, popularity: null });
const AMB = "urn:tag:ambience:qloo";
const GENRE = "urn:tag:genre:place";
const WHO = "urn:tag:customer_identity:qloo";

describe("lift against the city list", () => {
  const city = [tag("x:lively", AMB, 0.9999), tag("x:families", WHO, 0.9998), tag("x:sports_bar", GENRE, 0.9995), tag("x:steak", GENRE, 0.9991), tag("x:concert_hall", GENRE, 0.999)];
  const block = [tag("x:concert_hall", GENRE, 0.9995), tag("x:tourists", WHO, 0.9994), tag("x:lively", AMB, 0.9993), tag("x:rooftop", GENRE, 0.9992)];

  it("drops identity-style tags and ranks by city rank over block rank", () => {
    const rows = liftAgainstCity(block, city);
    expect(rows.some((r) => r.type === WHO)).toBe(false);
    const hall = rows.find((r) => r.name === "concert_hall");
    expect(hall).toMatchObject({ blockRank: 1, cityRank: 4, lift: 4, distinctive: false });
    const lively = rows.find((r) => r.name === "lively");
    expect(lively).toMatchObject({ blockRank: 2, cityRank: 1, lift: 0.5 });
    const roof = rows.find((r) => r.name === "rooftop");
    expect(roof).toMatchObject({ cityRank: null, distinctive: true, lift: 1.7 }); // city has 4 taste rows, so rank 5 / block rank 3
    expect(rows[0].name).toBe("concert_hall");
  });

  it("two blocks with the same city list get different orders", () => {
    const other = [tag("x:steak", GENRE, 0.9996), tag("x:lively", AMB, 0.9995), tag("x:concert_hall", GENRE, 0.9993)];
    expect(rankTags(block, city)[0].name).not.toBe(rankTags(other, city)[0].name);
  });

  it("without a city list keeps Qloo's order and reports no lift", () => {
    const rows = rankTags(block, null);
    expect(rows.map((r) => r.name)).toEqual(["concert_hall", "lively", "rooftop"]);
    expect(rows.every((r) => r.lift === null)).toBe(true);
  });

  it("shows the nines of an affinity so 0.9998 and 0.9979 differ", () => {
    expect(ninesScore(0.9998)).toBeGreaterThan(ninesScore(0.9979));
    expect(ninesScore(null)).toBe(0);
    expect(ninesScore(1)).toBe(1);
  });
});

describe("audience card", () => {
  const tagBody = (rows: [string, string, number][]) => ({ success: true, results: { tags: rows.map(([id, subtype, affinity]) => ({ tag_id: id, name: id.split(":").pop(), types: ["urn:entity:place"], subtype, query: { affinity } })) } });
  const city = rec("city-tags", "/v2/insights", { "filter.type": "urn:tag", "signal.location.query": "Atlanta", take: 50 }, tagBody([["u:lively", "urn:tag:ambience:qloo", 0.9999], ["u:steak", "urn:tag:specialty_dish:place", 0.9991]]));
  const block = rec("tags-by-place", "/v2/insights", { "filter.type": "urn:tag", "signal.location": "POINT(-84.39 33.78)", take: 50 }, tagBody([["u:steak", "urn:tag:specialty_dish:place", 0.9995], ["u:lively", "urn:tag:ambience:qloo", 0.9993]]));
  const brands = rec("brands-by-place", "/v2/insights", { "filter.type": "urn:entity:brand", "signal.location": "POINT(-84.39 33.78)", take: 10 }, {
    success: true, results: { entities: [{ entity_id: "B1", name: "Lantern Street Brewing", subtype: "urn:entity:brand", popularity: 0.7, query: { affinity: 0.9994, measurements: { audience_growth: 0 } } }, { entity_id: "B2", name: "Peach Row Records", subtype: "urn:entity:brand", popularity: 0.5, query: { affinity: 0.998 } }] },
  });
  it("ranks tags by lift, scores brands by nines, and reports live request ids", async () => {
    const { buildAudienceCard } = await import("./card");
    const { client } = fakeQloo([city, block, brands]);
    const { card, sources } = await buildAudienceCard(client, { id: "ATL-0020", lat: 33.78, lng: -84.39 });
    expect(card.topTags[0]).toMatchObject({ name: "steak", lift: 2 });
    expect(card.brands.map((b) => b.name)).toEqual(["Lantern Street Brewing", "Peach Row Records"]);
    expect(card.brands[0].score).toBeGreaterThan(card.brands[1].score);
    expect(sources.tags.requestId).toMatch(/^req-/);
    expect(sources.brands.cached).toBe(false);
    expect(sources.baseline).not.toBeNull();
  });
  it("shows tags without lift when only the Atlanta baseline fails, and fails the card when a block call fails", async () => {
    const { buildAudienceCard } = await import("./card");
    const noCity = fakeQloo([block, brands]).client;
    const r = await buildAudienceCard(noCity, { id: "ATL-0020", lat: 33.78, lng: -84.39 });
    expect(r.card.topTags.every((t) => t.lift === null)).toBe(true);
    expect(r.sources.baseline).toBeNull();
    const noBlock = fakeQloo([city, brands]).client;
    await expect(buildAudienceCard(noBlock, { id: "ATL-0020", lat: 33.78, lng: -84.39 })).rejects.toMatchObject({ code: "bad_request" });
  });
});
