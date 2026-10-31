import { describe, expect, it } from "vitest";
import type { RunStep } from "@/contract";
import { momentOf, stageStates, STAGES, totals } from "./run-derive";

const step = (p: Partial<RunStep>): RunStep => ({
  id: p.id ?? "s", at: "2026-10-30T11:00:00Z", role: p.role ?? "super-vl", model: null, title: p.title ?? "", tool: p.tool ?? null, summary: p.summary ?? "",
  ms: p.ms ?? 100, tokensIn: p.tokensIn ?? null, tokensOut: p.tokensOut ?? null, costUsd: p.costUsd ?? null, requestId: null, cached: false, status: p.status ?? "ok",
});

describe("run trace views", () => {
  it("marks the furthest reached stage as current while streaming and skips an unneeded redraft at the end", () => {
    const steps = [step({ role: "live-guard", title: "brief passes the taste-only check" }), step({ role: "embedding", title: "map the brief to Qloo tags" })];
    expect(stageStates(steps, false).slice(0, 3)).toEqual(["done", "current", "pending"]);
    const done = stageStates(steps, true);
    expect(done[1]).toBe("done");
    expect(done[STAGES.length - 1]).toBe("skipped");
  });
  it("finds the vision drop from the plan's picks and the review flags", () => {
    const read = step({ title: "read the site photo of ATL-0101", summary: "ATL-0101: partial sightline, medium clutter, face fills 4%." });
    expect(momentOf(read, undefined, new Set(["ATL-0116"]))?.kind).toBe("vision-drop");
    expect(momentOf(read, undefined, new Set(["ATL-0101"]))?.kind).toBe("vision-kept");
    expect(momentOf(step({ role: "ultra", summary: "1 flag(s): ATL-0046 off-brand." }), undefined, null)?.label).toBe("1 flagged");
    expect(momentOf(step({ role: "lightning", title: "redraft 3 lines for ATL-0046" }), undefined, null)?.kind).toBe("redrafted");
  });
  it("calls an errored step followed by the same call a retry", () => {
    const a = step({ role: "lightning", title: "write 3 lines for ATL-0105", status: "error" });
    expect(momentOf(a, step({ role: "lightning", title: "write 3 lines for ATL-0105 (loose)" }), null)?.kind).toBe("retried");
  });
  it("adds up time, tokens and cost", () => {
    expect(totals([step({ ms: 200, tokensIn: 10, tokensOut: 5, costUsd: 0.001 }), step({ ms: 300 })])).toEqual({ steps: 2, ms: 500, tokens: 15, costUsd: 0.001 });
  });
});
