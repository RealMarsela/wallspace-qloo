import type { z } from "zod";
import { ApiError } from "@/contract";
import { ApiFailure, api } from "@/lib/api-client";

/** True when the UI should read src/mocks-style sample data instead of /api (NEXT_PUBLIC_DATA_MODE !== "app"). */
export const isMock = () => api.mode === "mock";

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch + zod parse for UI-B routes not yet in src/lib/api-client.ts; errors follow the { error, code? } contract. */
export async function getJson<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiFailure("Network unreachable. Check your connection and try again.", 0, "network");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(body);
    throw new ApiFailure(parsed.success ? parsed.data.error : `Request failed (${res.status})`, res.status, parsed.success ? parsed.data.code : undefined);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiFailure("The server sent data this page does not understand.", res.status, "contract");
  return parsed.data;
}
