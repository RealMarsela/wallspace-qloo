import { ApiError, MeResponse } from "@/contract";

// Browser helpers for the auth routes. Same-origin fetches carry the session cookie; every failure becomes an Error with the API's message.
export const AUTH_EVENT = "wallspace:auth";

// One /api/me answer is shared by every link and guard on a page: calls inside CACHE_MS reuse it; a sign-in, sign-out or setup change clears it.
const CACHE_MS = 15_000;
let cached: { at: number; promise: Promise<MeResponse> } | null = null;
/** Clears the shared answer and tells every useMe to reload. Pass a fresh answer to hand it over directly (no refetch race). */
export const notifyAuthChanged = (fresh?: MeResponse) => {
  cached = fresh ? { at: Date.now(), promise: Promise.resolve(fresh) } : null;
  window.dispatchEvent(new CustomEvent<MeResponse | undefined>(AUTH_EVENT, { detail: fresh }));
};

export async function sendJson(method: "POST" | "PATCH", path: string, body?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(path, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error("Network unreachable. Check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = ApiError.safeParse(data);
    throw new Error(e.success ? e.data.error : `Request failed (${res.status})`);
  }
  return data;
}

export function fetchMe(fresh = false): Promise<MeResponse> {
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.promise;
  const promise = fetch("/api/me", { cache: "no-store" }).then(async (res) => MeResponse.parse(await res.json()));
  const entry = { at: Date.now(), promise };
  cached = entry;
  promise.catch(() => {
    if (cached === entry) cached = null;
  });
  return promise;
}

/** Only paths under /app are honoured after sign-in (open-redirect guard); anything else lands on /app. */
export const safeNext = (raw: string | null): string =>
  raw && /^\/app(?:[/?][\w\-./?=&%]*)?$/.test(raw) && !raw.includes("..") ? raw : "/app";
