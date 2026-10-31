import type { Brief, Plan } from "@/contract";
import { getStore, type Store } from "../db";

// Helpers for the route-level tests: real handlers, an in-memory app store and an in-memory SQLite for accounts.
export const ORIGIN = "http://localhost:3207";

let ip = 0;
/** A fresh client IP per call so the per-IP rate limits of one test never spill into another. */
export const freshIp = () => `10.0.${Math.floor(++ip / 250)}.${ip % 250}`;

export function req(path: string, init: { method?: string; cookie?: string; body?: unknown; ip?: string; origin?: string } = {}): Request {
  const headers: Record<string, string> = { "x-forwarded-for": init.ip ?? freshIp() };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  if (init.origin) headers.origin = init.origin;
  return new Request(`${ORIGIN}${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}

export const cookieOf = (res: Response): string => (res.headers.get("set-cookie") ?? "").split(";")[0];

export const store = (): Promise<Store> => getStore({ STORE_DRIVER: "memory" } as never);

export const briefBody = {
  brandName: "Harbor Light Coffee", audienceText: "people who love live stand-up and late-night food", loves: ["stand-up comedy specials"],
  budgetUsd: 6000, flightStart: "2026-12-01", flightWeeks: 4,
};

export const planFixture = (id: string, over: Partial<Plan> = {}): Plan => ({
  id, briefId: `brief-${id}`, runId: `run-${id}`, status: "ready", picks: [], scoredCount: 40, droppedCount: 2, spendUsd: 5800, split: [],
  heat: [], nemoJobId: null, lastRescanAt: null, createdAt: "2026-10-30T08:01:00.000Z", sample: false, ...over,
});

export const briefFixture = (id: string): Brief => ({
  id, brandName: "Harbor Light Coffee", brandSample: false, audienceText: "people who love live stand-up", loves: ["stand-up comedy specials"], seeds: [],
  city: "atlanta", budgetUsd: 6000, flightStart: "2026-12-01", flightWeeks: 4, brandVoice: null, creativeUrl: null, createdAt: "2026-10-30T08:00:00.000Z",
});
