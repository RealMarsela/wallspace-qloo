// Tavily credits are shared by six products. This ledger caps Wallspace: 3 new searches per visitor session, a daily slice, and a total.
// The Durable Object (budget-do.ts) wraps it over its own storage; tests run it over a Map.
export interface BudgetStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
}

export interface BudgetCaps {
  total: number;
  day: number;
  sessionSearches: number;
}

export const VISITOR_CAPS: BudgetCaps = { total: 150, day: 10, sessionSearches: 3 };
// One-off warm-up of the demo neighbourhoods by the builder, never from a visitor session.
export const PREWARM_CAPS: BudgetCaps = { total: 150, day: 40, sessionSearches: 40 };

export type BudgetResult = { ok: true; total: number; today: number } | { ok: false; reason: "total_cap" | "day_cap" | "session_cap"; total: number; today: number };

export const dayKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

export class TavilyBudgetCore {
  constructor(private readonly store: BudgetStorage, private readonly clock: () => number = Date.now) {}

  async status(caps: BudgetCaps = VISITOR_CAPS) {
    const total = (await this.store.get<number>("total")) ?? 0;
    const days = (await this.store.get<Record<string, number>>("days")) ?? {};
    return { total, today: days[dayKey(this.clock())] ?? 0, capTotal: caps.total, capDay: caps.day };
  }

  // Reserve before a live search+extract. credits = what the pair will cost.
  async reserve(sessionId: string, credits: number, caps: BudgetCaps = VISITOR_CAPS): Promise<BudgetResult> {
    const total = (await this.store.get<number>("total")) ?? 0;
    const days = (await this.store.get<Record<string, number>>("days")) ?? {};
    const sessions = (await this.store.get<Record<string, number>>("sessions")) ?? {};
    const day = dayKey(this.clock());
    const today = days[day] ?? 0;
    const base = { total, today };
    if (total + credits > caps.total) return { ok: false, reason: "total_cap", ...base };
    if (today + credits > caps.day) return { ok: false, reason: "day_cap", ...base };
    if ((sessions[sessionId] ?? 0) + 1 > caps.sessionSearches) return { ok: false, reason: "session_cap", ...base };
    await this.store.put("total", total + credits);
    await this.store.put("days", { ...Object.fromEntries(Object.entries(days).slice(-13)), [day]: today + credits });
    await this.store.put("sessions", { ...Object.fromEntries(Object.entries(sessions).slice(-200)), [sessionId]: (sessions[sessionId] ?? 0) + 1 });
    return { ok: true, total: total + credits, today: today + credits };
  }

  async refund(sessionId: string, credits: number): Promise<void> {
    const total = (await this.store.get<number>("total")) ?? 0;
    const days = (await this.store.get<Record<string, number>>("days")) ?? {};
    const sessions = (await this.store.get<Record<string, number>>("sessions")) ?? {};
    const day = dayKey(this.clock());
    await this.store.put("total", Math.max(0, total - credits));
    await this.store.put("days", { ...days, [day]: Math.max(0, (days[day] ?? 0) - credits) });
    await this.store.put("sessions", { ...sessions, [sessionId]: Math.max(0, (sessions[sessionId] ?? 0) - 1) });
  }
}

// Talks to the budget Durable Object (or any stub with the same fetch contract).
export interface BudgetClient {
  reserve(sessionId: string, credits: number, bucket: "visitor" | "prewarm"): Promise<BudgetResult>;
  refund(sessionId: string, credits: number): Promise<void>;
}

export function budgetClientFromStub(stub: { fetch(input: Request | string, init?: RequestInit): Promise<Response> }): BudgetClient {
  const call = async (path: string, body: unknown) => (await stub.fetch(`https://budget.internal/${path}`, { method: "POST", body: JSON.stringify(body) })).json();
  return {
    reserve: (sessionId, credits, bucket) => call("reserve", { sessionId, credits, bucket }) as Promise<BudgetResult>,
    refund: async (sessionId, credits) => void (await call("refund", { sessionId, credits })),
  };
}

export function memoryBudget(core: TavilyBudgetCore): BudgetClient {
  return {
    reserve: (s, c, b) => core.reserve(s, c, b === "prewarm" ? PREWARM_CAPS : VISITOR_CAPS),
    refund: (s, c) => core.refund(s, c),
  };
}
