import { describe, expect, it } from "vitest";
import { fakeQloo, type Route } from "../qloo/test-client";
import { nameMatches, qlooPortFor } from "./qloo-adapter";

const rec = (_kind: string, endpoint: string, params: NonNullable<Route["match"]>, body: unknown): Route => ({ endpoint, match: params, body });
const SEARCH = { types: "urn:entity:tv_show,urn:entity:movie,urn:entity:artist", take: 3 };
const row = (name: string, entity_id: string, popularity: number | null) => ({ name, entity_id, types: ["urn:entity:tv_show"], popularity });
const port = async (...routes: Route[]) => qlooPortFor(fakeQloo(routes).client);
const tagRows = (...r: [string, string, number][]) => ({ success: true, results: { tags: r.map(([id, subtype, affinity]) => ({ tag_id: id, name: id.split(":").pop(), types: ["urn:entity:place"], subtype, query: { affinity } })) } });
const face = { lat: 33.78, lng: -84.39, neighbourhood: "Midtown" };
const BLOCK = { "filter.type": "urn:tag", "signal.location": "POINT(-84.39 33.78)", take: 50 };
const CITY = { "filter.type": "urn:tag", "signal.location.query": "Atlanta", take: 50 };

describe("search seeds", () => {
  it("matches only when half of the phrase's words are in the name", () => {
    expect(nameMatches("90s sitcoms", "That '90s Show")).toBe(true);
    expect(nameMatches("southern hip-hop", "The Tragically Hip")).toBe(false);
    expect(nameMatches("", "Anything")).toBe(false);
  });
  it("takes a popular matching row, skips an obscure one,", async () => {
    const p = await port(
      rec("search", "/search", { query: "90s sitcoms", ...SEARCH }, { results: [row("Mid90s", "A1", 0.99), row("That '90s Show", "B2", 0.9)] }),
      rec("search", "/search", { query: "stand-up comedy specials", ...SEARCH }, { results: [row("Jack Tucker: Comedy Standup Hour", "C3", null), row("Stand Up Comedy Special", "D4", null)] }),
    );
    expect((await p.search("90s sitcoms")).data).toMatchObject({ qlooId: "B2", name: "That '90s Show", via: "search" });
    expect((await p.search("stand-up comedy specials")).data).toBeNull();
  });
});

describe("block tags", () => {
  const city = rec("city-tags", "/v2/insights", CITY, tagRows(["u:lively", "urn:tag:ambience:qloo", 0.9999], ["u:families", "urn:tag:customer_identity:qloo", 0.9998], ["u:steak", "urn:tag:specialty_dish:place", 0.9991]));
  it("ranks by lift against the Atlanta list and drops identity tags", async () => {
    const p = await port(city, rec("tags-by-place", "/v2/insights", BLOCK, tagRows(["u:steak", "urn:tag:specialty_dish:place", 0.9995], ["u:tourists", "urn:tag:customer_identity:qloo", 0.9994], ["u:lively", "urn:tag:ambience:qloo", 0.9993])));
    const r = await p.blockTags(face, []);
    expect(r.data.map((t) => t.name)).toEqual(["steak", "lively"]);
    expect(r.data[0]).toMatchObject({ lift: 2 });
    expect(r.data[0].affinity).toBeCloseTo(0.667, 2);
    expect(r.tool).toContain("lift vs Atlanta");
  });
  it("without an Atlanta list keeps Qloo's affinity and no lift", async () => {
    const p = await port(rec("tags-by-place", "/v2/insights", BLOCK, tagRows(["u:steak", "urn:tag:specialty_dish:place", 0.9995])));
    expect((await p.blockTags(face, [])).data[0]).toMatchObject({ lift: null });
  });
});

describe("trending", () => {
  it("never asks for places and marks nothing rising when Qloo has no trend list", async () => {
    const p = await port();
    const r = await p.trending(["Comedy", "Steak"]);
    expect(r.data).toEqual([{ name: "comedy", rising: false, delta: null }, { name: "steak", rising: false, delta: null }]);
    expect(r.tool).toContain("nothing marked rising");
  });
  it("marks a tag rising when the trend-biased Atlanta list ranks it higher", async () => {
    const p = await port(
      rec("city-tags", "/v2/insights", CITY, tagRows(["u:steak", "t:a", 0.9], ["u:brunch", "t:a", 0.8])),
      rec("city-tags", "/v2/insights", { ...CITY, "bias.trends": "high" }, tagRows(["u:brunch", "t:a", 0.9], ["u:steak", "t:a", 0.8])),
    );
    const r = await p.trending(["brunch", "steak"]);
    expect(r.data).toEqual([{ name: "brunch", rising: true, delta: 1 }, { name: "steak", rising: false, delta: -1 }]);
  });
});
