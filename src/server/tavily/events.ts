import { z } from "zod";
import type { RunStep } from "@/contract";
import { LocalEvent } from "@/contract";
import type { KvMin } from "../agent/ports";
import { chatJson, isModelUnavailable, type TokenFactory } from "../models";
import type { BudgetClient } from "./budget-core";
import { TavilyError, type Tavily } from "./client";

type LocalEventT = z.infer<typeof LocalEvent>;

export interface EventsDeps {
  tavily: Tavily | null;
  tf: TokenFactory | null;
  kv: KvMin;
  budget: BudgetClient | null;
  sessionId: string;
  bucket: "visitor" | "prewarm";
}

export interface FlightWindow {
  start: string; // ISO date
  weeks: number;
}

export interface EventsResult {
  events: LocalEventT[];
  found: number;
  kept: number;
  fromCache: boolean;
  note: string | null; // why live search did not run
  steps: RunStep[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const eventsCacheKey = (neighbourhood: string, flightStart: string) => `tavily:events:v1:${slug(neighbourhood)}:${flightStart.slice(0, 7)}`;

function windowEnd(w: FlightWindow): string {
  return new Date(Date.parse(w.start) + w.weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

const Triage = z.object({
  events: z.array(z.object({ title: z.string(), date: z.string().nullable(), url: z.string(), nearby: z.boolean() })).max(30),
});

interface Cached {
  events: LocalEventT[];
  found: number;
  at: string;
}

const tavilyStep = (neighbourhood: string, summary: string, ms: number, cached: boolean, requestId: string | null, status: RunStep["status"] = "ok", errorCode: string | null = null): RunStep => ({
  id: `tavily-${slug(neighbourhood)}`,
  at: new Date().toISOString(),
  role: "tavily",
  model: null,
  title: `events near ${neighbourhood}`,
  tool: "tavily.search + extract",
  summary,
  ms,
  tokensIn: null,
  tokensOut: null,
  costUsd: 0,
  requestId,
  cached,
  status,
  errorCode,
});

// Events during the flight for one neighbourhood: KV first, live Tavily only inside the budget, Lightning keeps real dated nearby events.
export async function eventsFor(d: EventsDeps, neighbourhood: string, flight: FlightWindow): Promise<EventsResult> {
  const key = eventsCacheKey(neighbourhood, flight.start);
  const hit = await d.kv.get(key);
  if (hit) {
    const c = JSON.parse(hit) as Cached;
    const kept = c.events.filter((e) => e.date >= flight.start && e.date <= windowEnd(flight));
    return { events: kept, found: c.found, kept: kept.length, fromCache: true, note: null, steps: [tavilyStep(neighbourhood, `cached ${c.at.slice(0, 10)}: found ${c.found}, kept ${kept.length}`, 0, true, null)] };
  }
  const skip = (note: string, code: string | null = "not_searched"): EventsResult => ({ events: [], found: 0, kept: 0, fromCache: false, note, steps: [tavilyStep(neighbourhood, note, 0, false, null, "skipped", code)] });
  if (!d.tavily || !d.tf) return skip("no events checked: Tavily is not configured");
  if (d.budget) {
    const r = await d.budget.reserve(d.sessionId, 2, d.bucket);
    if (!r.ok) return skip(`no events checked (${r.reason.replace("_", " ")}); using saved events only`);
  }
  const month = new Date(flight.start).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const steps: RunStep[] = [];
  try {
    const search = await d.tavily.search(`${neighbourhood} Atlanta events ${month}`, 6);
    const urls = search.data.filter((r) => r.score >= 0.3).slice(0, 2).map((r) => r.url);
    const extract = urls.length ? await d.tavily.extract(urls) : { data: [], requestId: null, ms: 0, cached: false };
    const pages = [
      ...search.data.slice(0, 6).map((r) => `# ${r.title}\n${r.url}\n${r.content.slice(0, 500)}`),
      ...extract.data.map((p) => `# EXTRACT ${p.url}\n${p.text.slice(0, 3500)}`),
    ].join("\n\n");
    const tri = await chatJson(d.tf, {
      role: "lightning",
      reasoning: "off",
      temperature: 0,
      maxTokens: 900,
      meta: { title: `keep real dated events near ${neighbourhood}`, tool: "triage" },
      messages: [
        { role: "system", content: `You read web pages about events in Atlanta. List concrete events with a date. Reply as JSON {"events":[{"title":string,"date":"YYYY-MM-DD"|null,"url":string,"nearby":boolean}]}. Year is 2026 unless the page says otherwise. nearby = true only when the event is in or next to ${neighbourhood}. Skip listicles, recurring-weekly entries and anything undated. Use the page url for url.` },
        { role: "user", content: pages },
      ],
    }, Triage);
    steps.push(...tri.steps);
    const events = tri.value.events
      .filter((e) => e.nearby && e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date >= flight.start && e.date <= windowEnd(flight))
      .map((e) => ({ title: e.title.slice(0, 120), date: e.date as string, distanceM: null, url: e.url }));
    const at = new Date().toISOString();
    await d.kv.put(key, JSON.stringify({ events, found: tri.value.events.length, at } satisfies Cached), { expirationTtl: 60 * 86_400 });
    const ts = tavilyStep(neighbourhood, `Tavily found ${tri.value.events.length}, Nemotron kept ${events.length}`, search.ms + extract.ms, false, search.requestId);
    return { events, found: tri.value.events.length, kept: events.length, fromCache: false, note: null, steps: [ts, ...tri.steps] };
  } catch (e) {
    if (d.budget && e instanceof TavilyError) await d.budget.refund(d.sessionId, 2);
    // Tavily down, or the triage model gone: no events for this neighbourhood, the plan goes on, the step says so.
    const code = (e as { code?: string }).code ?? "error";
    const why = isModelUnavailable(e) ? `skipped (model unavailable): triage model returned ${code}` : `search failed (${code}: ${e instanceof Error ? e.message.slice(0, 80) : "error"})`;
    const note = `no events checked: ${why}; the plan continues without events`;
    return { events: [], found: 0, kept: 0, fromCache: false, note, steps: [...steps, tavilyStep(neighbourhood, note, 0, false, null, "skipped", code)] };
  }
}
