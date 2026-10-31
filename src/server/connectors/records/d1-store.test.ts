import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { sampleRecordsPlan } from "@/mocks/connectors-records";
import { sendToHubspot, pollHubspot } from "../crm/hubspot";
import { MockComposio } from "@/mocks/connectors-records-composio";
import { d1RecordsStore, type D1Db } from "./d1-store";

// Runs the real 0004 migration and the real SQL against SQLite through a D1-shaped shim.
function shim(): D1Db {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("migrations/0004_records.sql", "utf8"));
  const stmt = (sql: string, args: unknown[] = []): ReturnType<D1Db["prepare"]> => ({
    bind: (...v) => stmt(sql, v),
    run: async () => void db.prepare(sql).run(...(args as never[])),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
  });
  return { prepare: (sql) => stmt(sql) };
}

describe("D1 records store against the 0004 migration", () => {
  it("upserts links on the composite key and round-trips snapshots", async () => {
    const s = d1RecordsStore(shim());
    const base = { planId: "p1", provider: "hubspot", kind: "deal", externalId: "d1", url: null, updatedAt: "2026-10-30T09:00:00.000Z" } as const;
    await s.putLink({ ...base, snapshot: { dealstage: "appointmentscheduled" } });
    await s.putLink({ ...base, url: "https://x.example/d1", snapshot: { dealstage: "closedwon" } });
    await s.putLink({ ...base, provider: "google-sheets", kind: "spreadsheet", externalId: "sh1", snapshot: null });
    const hub = await s.getLinks("p1", "hubspot");
    expect(hub).toHaveLength(1);
    expect(hub[0]).toMatchObject({ url: "https://x.example/d1", snapshot: { dealstage: "closedwon" } });
    expect(await s.getLinks("p1")).toHaveLength(2);
    expect((await s.linksByProvider("google-sheets"))[0].snapshot).toBeNull();
  });

  it("appends and lists the sync log newest first", async () => {
    const s = d1RecordsStore(shim());
    const e = (id: string, at: string, ok = true) => ({ id, planId: "p1", provider: "hubspot" as const, direction: "in" as const, kind: "deal-stage" as const, summary: id, detail: { n: 1 }, ok, at });
    await s.appendEvent(e("a", "2026-10-30T09:00:00.000Z"));
    await s.appendEvent(e("b", "2026-10-30T09:05:00.000Z", false));
    const list = await s.listEvents("p1", 10);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
    expect(list[0]).toMatchObject({ ok: false, detail: { n: 1 } });
    expect(await s.listEvents("other")).toEqual([]);
  });

  it("drives a full HubSpot send and poll on the SQL store", async () => {
    const store = d1RecordsStore(shim());
    const composio = new MockComposio();
    const deps = { composio, store, appUrl: "https://wallspace.pages.dev" };
    const { externalId } = await sendToHubspot(deps, { ...sampleRecordsPlan });
    composio.setDealStage(externalId!, "closedwon");
    expect((await pollHubspot(deps)).events).toHaveLength(1);
    expect((await pollHubspot(deps)).events).toHaveLength(0);
    expect((await store.listEvents(sampleRecordsPlan.plan.id)).map((e) => e.kind)).toContain("deal-stage");
  });
});
