import { describe, expect, it } from "vitest";
import { offsetPolyline, pointAt, roundedPath } from "./geometry";

describe("street geometry", () => {
  const L = [[0, 0], [100, 0], [100, 100]] as const; // right, then a right turn down

  it("offsets left of travel and keeps the corner on the bisector", () => {
    const o = offsetPolyline(L, 10);
    expect(o[0]).toEqual([0, -10]);
    expect(o[1][0]).toBeCloseTo(110);
    expect(o[1][1]).toBeCloseTo(-10);
    expect(o[2][0]).toBeCloseTo(110);
  });

  it("rounds a right turn clockwise and grows the radius on the outer lane", () => {
    expect(roundedPath(L, 40)).toBe("M0 0 L60 0 A40 40 0 0 1 100 40 L100 100");
    const outer = roundedPath(offsetPolyline(L, 10), 40, 10);
    expect(outer).toContain("A50 50 0 0 1");
  });

  it("clamps the radius to half the shorter segment", () => {
    expect(roundedPath([[0, 0], [20, 0], [20, 100]], 80)).toContain("A10 10");
  });

  it("finds a point along the line", () => {
    expect(pointAt(L, 0.25)).toEqual([50, 0]);
    expect(pointAt(L, 0.75)).toEqual([100, 50]);
  });
});
