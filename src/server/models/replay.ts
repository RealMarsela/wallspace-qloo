import type { RecordedResponse, ReplayStore } from "./types";

export class MemoryReplayStore implements ReplayStore {
  readonly map = new Map<string, RecordedResponse>();
  constructor(seed?: Record<string, RecordedResponse>) {
    for (const [k, v] of Object.entries(seed ?? {})) this.map.set(k, v);
  }
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async put(key: string, value: RecordedResponse) {
    this.map.set(key, value);
  }
}

export async function requestKey(path: string, body: unknown): Promise<string> {
  const data = new TextEncoder().encode(path + "\n" + JSON.stringify(body));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
