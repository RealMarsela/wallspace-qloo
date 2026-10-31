import { describe, expect, it } from "vitest";
import { PLAN_STATUS_LABEL, stepStatusLabel, statusLabel } from "./status-labels";

describe("status labels", () => {
  it("never shows a raw slug", () => {
    expect(PLAN_STATUS_LABEL["awaiting-nemo"]).toBe("Awaiting NeMo sign-off");
    expect(statusLabel("nemo-checked")).toBe("NeMo-checked");
    expect(statusLabel("flagged")).toBe("Copy needs a human");
    expect(statusLabel("some_new-slug")).toBe("Some new slug");
    for (const v of Object.values(PLAN_STATUS_LABEL)) expect(v).not.toMatch(/^[a-z]+-[a-z]+$/);
  });
  it("says why a step was skipped", () => {
    expect(stepStatusLabel({ status: "skipped", errorCode: "model_unavailable" })).toBe("Skipped: model unavailable");
    expect(stepStatusLabel({ status: "error", errorCode: "rate_limited" })).toBe("Failed: rate limited");
    expect(stepStatusLabel({ status: "ok", errorCode: null })).toBe("Done");
  });
});
