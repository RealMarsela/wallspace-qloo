import { describe, expect, it } from "vitest";
import { QlooMeterCore, type MeterStorage } from "./meter-core";

const mem = (): MeterStorage => {
  const m = new Map<string, unknown>();
  return { get: async <T,>(k: string) => m.get(k) as T | undefined, put: async (k, v) => void m.set(k, JSON.parse(JSON.stringify(v))) };
};

describe("QlooMeterCore", () => {
  it("counts reservations and refuses past the daily cap", async () => {
    const meter = new QlooMeterCore(mem(), () => Date.parse("2026-10-30T10:00:00Z"));
    const caps = { total: 10, day: 3 };
    for (let i = 0; i < 3; i++) expect((await meter.reserve(1, caps)).ok).toBe(true);
    const refused = await meter.reserve(1, caps);
    expect(refused).toMatchObject({ ok: false, reason: "day_cap", today: 3, total: 3 });
  });
  it("starts a new day with a fresh daily count but keeps the total", async () => {
    let now = Date.parse("2026-10-30T23:00:00Z");
    const meter = new QlooMeterCore(mem(), () => now);
    const caps = { total: 4, day: 2 };
    await meter.reserve(2, caps);
    now = Date.parse("2026-10-31T01:00:00Z");
    expect(await meter.reserve(2, caps)).toMatchObject({ ok: true, today: 2, total: 4 });
    expect(await meter.reserve(1, caps)).toMatchObject({ ok: false, reason: "total_cap" });
  });
  it("refunds a call that never left and never goes negative", async () => {
    const meter = new QlooMeterCore(mem());
    await meter.reserve(1);
    expect((await meter.refund(1)).total).toBe(0);
    expect((await meter.refund(5)).total).toBe(0);
  });
  it("defaults to 6,000 total and 1,500 a day", async () => {
    expect(await new QlooMeterCore(mem()).status()).toMatchObject({ capTotal: 6000, capDay: 1500, total: 0 });
  });
});
