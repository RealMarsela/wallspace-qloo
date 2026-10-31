import { describe, expect, it } from "vitest";
import type { Brief, Face, HeatCell } from "@/contract";
import { faces } from "@/data/faces";
import { faceAffinity, haversineM } from "./affinity";
import { faceCost, splitBudget } from "./optimize";
import { dropMissingEvidence, scoreFaces, visibilityWeight } from "./score";

const cell = (lat: number, lng: number, affinity: number): HeatCell => ({ geohash: "x", lat, lng, affinity });
const face = (id: string, over: Partial<Face> = {}): Face => ({ ...faces[0], id, ...over });
const brief = (budgetUsd: number, flightWeeks = 4): Pick<Brief, "budgetUsd" | "flightWeeks"> => ({ budgetUsd, flightWeeks });

describe("affinity", () => {
  it("measures distance in metres", () => {
    expect(haversineM({ lat: 33.75, lng: -84.39 }, { lat: 33.76, lng: -84.39 })).toBeGreaterThan(1100);
    expect(haversineM({ lat: 33.75, lng: -84.39 }, { lat: 33.75, lng: -84.39 })).toBe(0);
  });
  it("weights near cells over far cells and stays in 0..1", () => {
    const f = { lat: 33.76, lng: -84.35 };
    const a = faceAffinity(f, [cell(33.7601, -84.3501, 0.9), cell(33.768, -84.35, 0.1)]);
    expect(a.affinity).toBeGreaterThan(0.6);
    expect(a.affinity).toBeLessThanOrEqual(1);
    expect(a.cells).toBe(2);
  });
  it("gives no evidence, not zero taste, when no cell is in reach", () => {
    expect(faceAffinity({ lat: 33.76, lng: -84.35 }, [cell(33.9, -84.1, 1)])).toEqual({ affinity: 0, cells: 0, nearestM: null });
  });
});

describe("scoring and filters", () => {
  const heat = [cell(33.7648, -84.3489, 0.95), cell(33.84, -84.379, 0.3)];
  it("ranks best first and flags faces with no evidence", () => {
    const scored = scoreFaces(faces, heat);
    expect(scored.length).toBe(faces.length);
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
    expect(scored[0].face.neighbourhood).toMatch(/Little Five Points|Inman Park|Reynoldstown|Edgewood/);
    const { kept, dropped } = dropMissingEvidence(scored);
    expect(kept.length + dropped.length).toBe(faces.length);
    expect(dropped.every((d) => !d.hasEvidence && d.score === 0)).toBe(true);
    expect(dropped.length).toBeGreaterThan(0);
  });
  it("weights a bulletin above a poster and a kiosk, and a lit face slightly above an unlit one", () => {
    const w = (kind: Face["kind"], lit = false, widthFt = 48, heightFt = 14) => visibilityWeight({ kind, lit, widthFt, heightFt });
    expect(w("bulletin")).toBeGreaterThan(w("poster", false, 22.8, 10.5));
    expect(w("poster", false, 22.8, 10.5)).toBeGreaterThan(w("kiosk", false, 3.5, 6));
    expect(w("bulletin", true)).toBeGreaterThan(w("bulletin", false));
  });
  it("is deterministic", () => {
    expect(scoreFaces(faces, heat).map((s) => s.face.id)).toEqual(scoreFaces([...faces].reverse(), heat).map((s) => s.face.id));
  });
});

describe("budget optimizer", () => {
  const heat = faces.map((f) => cell(f.lat, f.lng, 0.8));
  const scored = scoreFaces(faces, heat);
  it("never exceeds the budget and prices by weeks", () => {
    const r = splitBudget(scored, brief(12000));
    expect(r.spendUsd).toBeLessThanOrEqual(12000);
    expect(r.spendUsd).toBe(Object.values(r.costs).reduce((a, b) => a + b, 0));
    expect(faceCost({ rateMonthUsd: 4345 }, 4)).toBe(4000);
  });
  it("keeps every neighbourhood within 30% of the budget", () => {
    const r = splitBudget(scored, brief(20000));
    const byHood: Record<string, number> = {};
    for (const p of r.picks) byHood[p.face.neighbourhood] = (byHood[p.face.neighbourhood] ?? 0) + r.costs[p.face.id];
    for (const usd of Object.values(byHood)) expect(usd).toBeLessThanOrEqual(20000 * 0.3);
    expect(r.split.reduce((a, s) => a + s.share, 0)).toBeGreaterThan(0.99);
  });
  it("mixes kinds and caps the picks", () => {
    const r = splitBudget(scored, brief(40000, 4));
    expect(r.picks.length).toBeLessThanOrEqual(12);
    expect(new Set(r.picks.map((p) => p.face.kind)).size).toBeGreaterThanOrEqual(2);
    const per = new Map<string, number>();
    for (const p of r.picks) per.set(p.face.kind, (per.get(p.face.kind) ?? 0) + 1);
    for (const n of per.values()) expect(n).toBeLessThanOrEqual(8);
  });
  it("ignores faces without evidence and off-taste faces, and returns nothing for a tiny budget", () => {
    const only = scoreFaces([face("ATL-9001", { lat: 33.7648, lng: -84.3489 }), face("ATL-9002", { lat: 33.9, lng: -84.1 })], [cell(33.7648, -84.3489, 0.9)]);
    expect(splitBudget(only, brief(50000)).picks.map((p) => p.face.id)).toEqual(["ATL-9001"]);
    expect(splitBudget(scored, brief(10)).picks).toEqual([]);
  });
  it("ranks by value: a cheap face with equal affinity beats a dear one", () => {
    const a = face("ATL-9101", { lat: 33.7648, lng: -84.3489, rateMonthUsd: 1000, neighbourhood: "A" });
    const b = face("ATL-9102", { lat: 33.7649, lng: -84.349, rateMonthUsd: 4000, neighbourhood: "B" });
    const r = splitBudget(scoreFaces([b, a], [cell(33.7648, -84.3489, 0.9)]), brief(4400), { maxPicks: 1 });
    expect(r.picks[0].face.id).toBe("ATL-9101");
  });
});
