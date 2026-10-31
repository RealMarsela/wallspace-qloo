import { describe, expect, it } from "vitest";
import type { RunStep } from "@/contract";
import { RunRoomCore, type RoomStorage } from "./run-room-core";

function storage(): RoomStorage {
  const m = new Map<string, unknown>();
  return {
    async get<T>(k: string) {
      return m.get(k) as T | undefined;
    },
    async put<T>(k: string, v: T) {
      m.set(k, v);
    },
    async list<T>(o?: { prefix?: string }) {
      return new Map([...m.entries()].filter(([k]) => k.startsWith(o?.prefix ?? "")) as [string, T][]);
    },
  };
}

const step = (id: string, summary = "s"): RunStep => ({ id, at: "2026-10-30T00:00:00Z", role: "lightning", model: "m", title: "t", tool: null, summary, ms: 1, tokensIn: 1, tokensOut: 1, costUsd: 0, requestId: null, cached: false, status: "ok" });

describe("RunRoomCore", () => {
  it("keeps steps in arrival order and reports a status", async () => {
    const c = new RunRoomCore(storage());
    await c.addStep(step("a"));
    await c.addStep(step("b"));
    expect((await c.steps()).map((s) => s.id)).toEqual(["a", "b"]);
    expect(await c.status()).toBe("running");
    await c.setStatus("done");
    expect(await c.status()).toBe("done");
  });
  it("a retried step id overwrites its row and is not fresh", async () => {
    const c = new RunRoomCore(storage());
    expect((await c.addStep(step("a", "first"))).fresh).toBe(true);
    expect((await c.addStep(step("a", "second"))).fresh).toBe(false);
    const all = await c.steps();
    expect(all).toHaveLength(1);
    expect(all[0].summary).toBe("second");
  });
});
