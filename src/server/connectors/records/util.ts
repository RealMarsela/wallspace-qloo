import { RecordEvent, type RecordEventKind, type RecordLink, type RecordLinkKind, type RecordsProvider } from "@/contract/connectors-records";
import { ToolError, type RecordsDeps, type ToolResult } from "./types";

export const nowIso = (deps: Pick<RecordsDeps, "now">): string => (deps.now ? deps.now() : new Date()).toISOString();

export function newId(deps: Pick<RecordsDeps, "newId">): string {
  return deps.newId ? deps.newId() : crypto.randomUUID();
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

export function get(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (Array.isArray(cur) && typeof k === "number") cur = cur[k];
    else if (isObj(cur) && typeof k === "string") cur = cur[k];
    else return undefined;
  }
  return cur;
}

// Composio wraps provider responses differently per tool (data.id, data.response_data.id, data.results[0].id, ...).
export function firstString(data: unknown, paths: (string | number)[][]): string | null {
  for (const p of paths) {
    const v = get(data, p);
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

export const ID_PATHS: (string | number)[][] = [
  ["id"], ["response_data", "id"], ["results", 0, "id"], ["data", "id"], ["details", "id"], ["spreadsheetId"], ["response_data", "spreadsheetId"],
];

export async function run(deps: RecordsDeps, slug: string, args: Json, provider: RecordsProvider): Promise<ToolResult> {
  const res = await deps.composio.execute(slug, args, provider);
  if (!res.successful) throw new ToolError(slug, res.error ?? "tool reported failure");
  return res;
}

export async function logEvent(
  deps: RecordsDeps,
  e: { planId: string; provider: RecordsProvider; direction: "out" | "in"; kind: RecordEventKind; summary: string; detail?: Json | null; ok?: boolean },
): Promise<RecordEvent> {
  const event = RecordEvent.parse({
    id: newId(deps), planId: e.planId, provider: e.provider, direction: e.direction, kind: e.kind,
    summary: e.summary, detail: e.detail ?? null, ok: e.ok ?? true, at: nowIso(deps),
  });
  await deps.store.appendEvent(event);
  if (deps.emit) await deps.emit(event).catch(() => undefined); // the mirror must never break a sync
  return event;
}

export async function saveLink(
  deps: RecordsDeps,
  l: { planId: string; provider: RecordsProvider; kind: RecordLinkKind; externalId: string; url?: string | null; snapshot?: Json | null },
): Promise<RecordLink> {
  const link: RecordLink = { planId: l.planId, provider: l.provider, kind: l.kind, externalId: l.externalId, url: l.url ?? null, snapshot: l.snapshot ?? null, updatedAt: nowIso(deps) };
  await deps.store.putLink(link);
  return link;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "unknown error";
}

export const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
