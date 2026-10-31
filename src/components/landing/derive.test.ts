import { describe, expect, it } from "vitest";
import { samplePlanResponse, sampleRun } from "@/mocks/plan-sample";
import { parseLift, photoReads, pickRows, runSummary, signOff } from "./derive";

describe("landing derive", () => {
  it("parses Qloo lift labels and plain tags", () => {
    expect(parseLift("over-indexes on Lively (4x vs Atlanta)")).toEqual({ tag: "Lively", lift: "4x" });
    expect(parseLift("over-indexes on Southern-Rap (5.1x vs Atlanta)")?.lift).toBe("5.1x");
    expect(parseLift("over-indexes on live comedy")).toEqual({ tag: "live comedy", lift: null });
    expect(parseLift("audience affinity in this cell")).toBeNull();
  });

  it("builds ranked rows with weekly cost from the flight length", () => {
    const rows = pickRows(samplePlanResponse);
    expect(rows.map((r) => r.rank)).toEqual([...rows.map((r) => r.rank)].sort((a, b) => a - b));
    const first = rows[0];
    const pick = samplePlanResponse.plan.picks.find((p) => p.faceId === first.faceId)!;
    expect(first.weeklyUsd).toBe(Math.round(pick.costUsd / samplePlanResponse.brief.flightWeeks));
    expect(first.line).toBe(pick.copy[pick.chosenCopy].text);
  });

  it("reads photo steps from the run log and puts a dropped face first", () => {
    const reads = photoReads({ ...sampleRun, steps: [
      { ...sampleRun.steps[0], id: "a", title: "choose which site photos to read", summary: "chose ATL-0101" },
      { ...sampleRun.steps[0], id: "b", title: "read the site photo of ATL-0116", summary: "ATL-0116: clear sightline, medium clutter, face fills 4%. Fully visible." },
      { ...sampleRun.steps[0], id: "c", title: "read the site photo of ATL-0101", summary: "ATL-0101: partial sightline, medium clutter, face fills 4%. Behind poles. Dropped: partly hidden." },
    ] });
    expect(reads.map((r) => [r.faceId, r.dropped, r.sightline, r.share])).toEqual([
      ["ATL-0101", true, "partial", 0.04],
      ["ATL-0116", false, "clear", 0.04],
    ]);
  });

  it("sums the run and the sign-off", () => {
    const s = runSummary(sampleRun);
    expect(s.steps).toBe(sampleRun.steps.length);
    expect(s.models.every((m) => m.calls > 0)).toBe(true);
    const so = signOff(samplePlanResponse);
    expect(so.lines).toBe(samplePlanResponse.plan.picks.reduce((n, p) => n + p.copy.length, 0));
  });
});
