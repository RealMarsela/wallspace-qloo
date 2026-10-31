import { describe, expect, it } from "vitest";
import { samplePlanResponse } from "@/mocks/plan-sample";
import { blockFor, concentration, defaultPair, faceOptions } from "./compare-derive";

const data = samplePlanResponse;

describe("compare blocks", () => {
  it("only compares picked faces (the stored heat grid is not per-face affinity)", () => {
    const unpicked = data.faces.find((f) => !data.plan.picks.some((p) => p.faceId === f.id));
    expect(unpicked).toBeDefined();
    expect(blockFor(data, unpicked!.id)).toBeNull();
    expect(faceOptions(data).map((o) => o.value).sort()).toEqual(data.plan.picks.map((p) => p.faceId).filter((id) => data.faces.some((f) => f.id === id)).sort());
  });
  it("defaults to the top pick against the thinnest-audience pick", () => {
    const pair = defaultPair(data);
    const top = [...data.plan.picks].sort((a, b) => a.rank - b.rank)[0];
    expect(pair?.[0]).toBe(top.faceId);
    const lowest = Math.min(...data.plan.picks.filter((p) => p.faceId !== top.faceId).map((p) => p.affinity));
    expect(blockFor(data, pair![1])?.affinity).toBe(lowest);
  });
  it("names the hotter side and the ratio", () => {
    const [a, b] = defaultPair(data)!;
    const top = blockFor(data, a)!;
    const low = blockFor(data, b)!;
    const c = concentration(low, top);
    expect(c.hotter).toBe(top.affinity > low.affinity ? "b" : "a");
    expect(c.ratio).toBeCloseTo(Math.max(top.affinity, low.affinity) / Math.min(top.affinity, low.affinity));
  });
});
