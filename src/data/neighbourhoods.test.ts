import { describe, expect, it } from "vitest";
import { neighbourhoodAt } from "./neighbourhoods";

describe("neighbourhoodAt", () => {
  it("finds official names", () => {
    expect(neighbourhoodAt(33.7473, -84.3922)).toBe("Downtown");
    expect(neighbourhoodAt(33.7991986, -84.3908649)).toBe("Midtown");
  });
  it("returns null outside the city layer", () => {
    expect(neighbourhoodAt(33.9, -84.25)).toBeNull();
  });
});
