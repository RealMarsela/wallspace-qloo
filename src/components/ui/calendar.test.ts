import { describe, expect, it } from "vitest";
import { addDays, flightEnd, monthGrid, rangeLabel, weeksBetween } from "./calendar";

describe("flight calendar maths", () => {
  it("ends a 4-week flight on the 28th day", () => {
    expect(flightEnd("2026-11-16", 4)).toBe("2026-12-13");
  });
  it("rounds a picked range up to whole weeks", () => {
    expect(weeksBetween("2026-11-16", "2026-11-16")).toBe(1);
    expect(weeksBetween("2026-11-16", "2026-11-29")).toBe(2);
    expect(weeksBetween("2026-11-16", "2026-11-30")).toBe(3);
  });
  it("caps flights at 52 weeks", () => {
    expect(weeksBetween("2026-01-01", "2028-01-01")).toBe(52);
  });
  it("starts month grids on Monday and crosses DST safely", () => {
    const g = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-10-26");
    expect(g[6]).toBe("2026-11-01");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  });
  it("labels a range across years", () => {
    expect(rangeLabel("2026-12-21", "2027-01-17")).toBe("21 Dec – 17 Jan 2027");
  });
});
