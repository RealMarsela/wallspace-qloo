import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { D1Store } from "./d1-store";
import type { D1Like, D1Stmt } from "./env";

// Runs the real migration and the real SQL against SQLite, through a thin D1-shaped shim.
function shim(): D1Like {
  const db = new DatabaseSync(":memory:");
  for (const f of ["0001_init.sql", "0003_comms.sql", "0005_auth_workspaces.sql"]) db.exec(readFileSync(`migrations/${f}`, "utf8"));
  const stmt = (sql: string, args: unknown[] = []): D1Stmt => ({
    bind: (...v) => stmt(sql, v),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) } }),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    first: async <T,>() => (db.prepare(sql).get(...(args as never[])) as T | undefined) ?? null,
  });
  return { prepare: (sql) => stmt(sql) };
}

describe("D1Store against the 0003 migration", () => {
  it("dedupes events by key and lists newest first with filters", async () => {
    const s = new D1Store(shim());
    const a = await s.recordEvent({ provider: "gmail", planId: "p1", direction: "in", kind: "reply", summary: "one", dedupeKey: "k1", at: "2026-10-30T08:00:00Z" });
    const dup = await s.recordEvent({ provider: "gmail", planId: "p1", direction: "in", kind: "reply", summary: "one again", dedupeKey: "k1" });
    await s.recordEvent({ provider: "slack", planId: "p2", direction: "out", kind: "sent", summary: "two", detail: { ts: "1" }, at: "2026-10-30T09:00:00Z" });
    expect(a.inserted).toBe(true);
    expect(await s.hasDedupe("k1")).toBe(true);
    expect(await s.hasDedupe("nope")).toBe(false);
    expect(dup.inserted).toBe(false);
    expect((await s.listEvents({ limit: 10 })).map((e) => e.summary)).toEqual(["two", "one"]);
    expect((await s.listEvents({ planId: "p1", limit: 10 })).map((e) => e.summary)).toEqual(["one"]);
    expect((await s.listEvents({ provider: "slack", limit: 10 }))[0].detail).toEqual({ ts: "1" });
    expect(await s.lastEventAt("gmail")).toBe("2026-10-30T08:00:00Z");
  });

  it("stores accounts, threads and webhook ids", async () => {
    const s = new D1Store(shim());
    await s.upsertAccount({ provider: "gmail", composioAccountId: "ca_1", userId: "wallspace-demo", label: "a@b.co", status: "ACTIVE" });
    await s.upsertAccount({ provider: "gmail", composioAccountId: "ca_2", userId: "wallspace-demo", label: "a@b.co", status: "ACTIVE" });
    expect((await s.getAccount("gmail"))?.composioAccountId).toBe("ca_2");
    await s.deleteAccount("gmail");
    expect(await s.getAccount("gmail")).toBeNull();
    const t = await s.saveThread({ planId: "p1", provider: "gmail", threadId: "t1", messageId: "m1", token: "[WS:p1]", recipient: "o@x.co", sentAt: "2026-10-30T08:00:00Z" });
    expect((await s.threadsForPlan("p1", "gmail"))[0].threadId).toBe("t1");
    expect((await s.findThread("gmail", "t1"))?.id).toBe(t.id);
    expect(await s.openThreads("gmail", "2026-10-30T00:00:00Z")).toHaveLength(1);
    await s.touchThread(t.id, "2026-10-30T08:05:00Z");
    expect((await s.threadsForPlan("p1"))[0].lastCheckedAt).toBe("2026-10-30T08:05:00Z");
    expect(await s.markWebhookSeen("w1")).toBe(true);
    expect(await s.markWebhookSeen("w1")).toBe(false);
  });
});
