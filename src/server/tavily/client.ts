import { z } from "zod";
import { requestKey } from "../models/replay";
import type { RecordedResponse, ReplayStore } from "../models/types";

export type TavilyMode = "live" | "replay";

export class TavilyError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "TavilyError";
  }
}

const SearchOut = z.object({
  results: z.array(z.object({ url: z.string(), title: z.string().default(""), content: z.string().default(""), score: z.number().default(0) })),
  request_id: z.string().optional(),
});
const ExtractOut = z.object({
  results: z.array(z.object({ url: z.string(), raw_content: z.string().default("") })),
  request_id: z.string().optional(),
});

export type TavilyResult = z.infer<typeof SearchOut>["results"][number];

export interface TavilyOptions {
  apiKey?: string;
  mode: TavilyMode;
  store?: ReplayStore; // replay source; live mode records into it when put exists
  fetchImpl?: typeof fetch;
}

export interface TavilyCall<T> {
  data: T;
  requestId: string | null;
  ms: number;
  cached: boolean;
}

export class Tavily {
  constructor(private readonly o: TavilyOptions) {}

  private async post(path: "search" | "extract", body: Record<string, unknown>): Promise<RecordedResponse & { cached: boolean }> {
    const key = await requestKey(`tavily/${path}`, body);
    if (this.o.mode === "replay") {
      const hit = await this.o.store?.get(key);
      if (!hit) throw new TavilyError(`no recorded Tavily ${path} for ${key}`, "replay_miss");
      return { ...hit, cached: true };
    }
    if (!this.o.apiKey) throw new TavilyError("TAVILY_API_KEY is not set", "no_key");
    const t0 = Date.now();
    const res = await (this.o.fetchImpl ?? fetch)(`https://api.tavily.com/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.o.apiKey}` },
      body: JSON.stringify(body),
    });
    const parsed: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new TavilyError(`Tavily ${res.status}`, res.status === 429 ? "rate_limited" : "upstream");
    const rec = { status: res.status, body: parsed, requestId: (parsed as { request_id?: string } | null)?.request_id ?? null, ms: Date.now() - t0 };
    await this.o.store?.put?.(key, rec);
    return { ...rec, cached: false };
  }

  async search(query: string, maxResults = 6): Promise<TavilyCall<TavilyResult[]>> {
    const rec = await this.post("search", { query, topic: "general", search_depth: "basic", max_results: maxResults });
    const out = SearchOut.safeParse(rec.body);
    if (!out.success) throw new TavilyError("unexpected Tavily search response", "bad_response");
    return { data: out.data.results, requestId: rec.requestId, ms: rec.ms, cached: rec.cached };
  }

  async extract(urls: string[]): Promise<TavilyCall<{ url: string; text: string }[]>> {
    const rec = await this.post("extract", { urls, extract_depth: "basic", format: "text" });
    const out = ExtractOut.safeParse(rec.body);
    if (!out.success) throw new TavilyError("unexpected Tavily extract response", "bad_response");
    return { data: out.data.results.map((r) => ({ url: r.url, text: r.raw_content })), requestId: rec.requestId, ms: rec.ms, cached: rec.cached };
  }
}
