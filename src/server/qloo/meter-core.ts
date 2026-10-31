// Hard cap on live Qloo calls: a total for the build and a daily slice. The Durable Object (worker/qloo-meter.ts) wraps this
// core over its own storage; tests run it over a Map. Reserve before every live call, refund when the call never left.
export interface MeterStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
}
export interface MeterCaps {
  total: number;
  day: number;
}
export interface MeterStatus {
  total: number;
  today: number;
  day: string;
  capTotal: number;
  capDay: number;
}
export type MeterResult = ({ ok: true } | { ok: false; reason: "total_cap" | "day_cap" }) & MeterStatus;

export const DEFAULT_CAPS: MeterCaps = { total: 6000, day: 1500 };
export const dayKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

export class QlooMeterCore {
  constructor(private readonly store: MeterStorage, private readonly clock: () => number = Date.now) {}

  private async read(): Promise<{ total: number; days: Record<string, number> }> {
    return { total: (await this.store.get<number>("total")) ?? 0, days: (await this.store.get<Record<string, number>>("days")) ?? {} };
  }

  async status(caps: MeterCaps = DEFAULT_CAPS): Promise<MeterStatus> {
    const { total, days } = await this.read();
    const day = dayKey(this.clock());
    return { total, today: days[day] ?? 0, day, capTotal: caps.total, capDay: caps.day };
  }

  async reserve(n = 1, caps: MeterCaps = DEFAULT_CAPS): Promise<MeterResult> {
    const { total, days } = await this.read();
    const day = dayKey(this.clock());
    const today = days[day] ?? 0;
    const base = { total, today, day, capTotal: caps.total, capDay: caps.day };
    if (total + n > caps.total) return { ok: false, reason: "total_cap", ...base };
    if (today + n > caps.day) return { ok: false, reason: "day_cap", ...base };
    await this.store.put("total", total + n);
    await this.store.put("days", { ...Object.fromEntries(Object.entries(days).slice(-13)), [day]: today + n });
    return { ok: true, ...base, total: total + n, today: today + n };
  }

  async refund(n = 1, caps: MeterCaps = DEFAULT_CAPS): Promise<MeterStatus> {
    const { total, days } = await this.read();
    const day = dayKey(this.clock());
    await this.store.put("total", Math.max(0, total - n));
    await this.store.put("days", { ...days, [day]: Math.max(0, (days[day] ?? 0) - n) });
    return this.status(caps);
  }
}
