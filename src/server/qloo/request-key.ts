import type { QlooParams } from "./types";

/** Canonical form of a request: path plus sorted, trimmed, lower-cased-urn parameters. Never contains the API key. */
export function normalizeRequest(endpoint: string, params: QlooParams): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => [k.trim(), String(v).trim().replace(/\s+/g, " ")] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `${endpoint}?${pairs.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

/** KV / replay key: "qloo:v1:" + first 32 hex of SHA-256 over the normalised request. */
export async function requestKey(endpoint: string, params: QlooParams): Promise<string> {
  const data = new TextEncoder().encode(normalizeRequest(endpoint, params));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `qloo:v1:${hex.slice(0, 32)}`;
}
export const defaultKey = (kind: string) => `qloo:v1:default:${kind}`;
