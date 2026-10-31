import { beforeEach, describe, expect, it } from "vitest";
import { fakeComposio, samplePlanBundle } from "@/mocks/connectors-comms";
import { ComposioClient } from "../composio/client";
import { listConnections } from "../composio/connections";
import { dispatchSend } from "../composio/dispatch";
import type { RuntimeContext } from "../composio/env";
import { setPlanLoader } from "../composio/plans";
import { getTriggerHandler, listProviders, senderProviders, type ProviderCtx } from "../composio/registry";
import { getStore, resetMemoryStore } from "../composio/store";
import { pollRecords } from "./index";
import { recordsDeps } from "./adapter";
import "../composio/boot";

const bundle = samplePlanBundle("plan-records-1");
const rt: RuntimeContext = { env: { COMPOSIO_API_KEY: "k" }, waitUntil: () => undefined };
const TOOLS = {
  HUBSPOT_SEARCH_COMPANIES: { results: [{ id: "co1" }] },
  HUBSPOT_UPSERT_CONTACTS: { results: [{ id: "ct1" }] },
  HUBSPOT_CREATE_DEAL: { id: "d1" },
  HUBSPOT_GET_DEAL: { id: "d1", url: "https://app.hubspot.example/deal/d1", properties: { dealstage: "appointmentscheduled", amount: "39600" } },
  HUBSPOT_CREATE_NOTE: { id: "n1" },
  GOOGLESHEETS_SHEET_FROM_JSON: { spreadsheetId: "sh1", display_url: "https://docs.google.com/spreadsheets/d/sh1/edit" },
};

function ctx(accounts: { id: string; toolkit: string }[], tools: Record<string, unknown> = TOOLS, toolSuccessful = true): ProviderCtx {
  return { rt, store: getStore(rt.env), composio: new ComposioClient({ apiKey: "k", fetchImpl: fakeComposio({ accounts, tools, toolSuccessful }).fetchImpl }), userId: "wallspace-demo", origin: "https://wallspace.pages.dev" };
}

beforeEach(() => {
  resetMemoryStore();
  setPlanLoader(async (id) => (id === bundle.plan.id ? bundle : null));
});

describe("records providers registered in B3's registries", () => {
  it("registers five providers, five senders and the trigger handlers", () => {
    const ids = listProviders().map((p) => p.id);
    for (const id of ["hubspot", "google-sheets", "google-calendar", "outlook-calendar", "openooh"]) {
      expect(ids).toContain(id);
      expect(senderProviders()).toContain(id);
    }
    expect(getTriggerHandler("GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER")).toBeTypeOf("function");
    expect(getTriggerHandler("OUTLOOK_EVENT_CHANGE_TRIGGER")).toBeTypeOf("function");
  });

  it("shows up in GET /api/connections with honest realtime labels; OpenOOH needs no account", async () => {
    const list = await listConnections(ctx([{ id: "ca1", toolkit: "hubspot" }]));
    const by = Object.fromEntries(list.map((c) => [c.provider, c]));
    expect(by.hubspot).toMatchObject({ status: "connected", category: "crm", realtime: "poll" });
    expect(by["google-sheets"]).toMatchObject({ status: "not-connected", category: "docs" });
    expect(by["outlook-calendar"].category).toBe("calendar");
    expect(by.openooh).toMatchObject({ status: "connected", category: "ooh", realtime: "none" });
  });
});

describe("POST /api/plans/:id/send for the records providers", () => {
  it("HubSpot send goes through the dispatcher, returns the deal and mirrors events into the plan log", async () => {
    const c = ctx([{ id: "ca1", toolkit: "hubspot" }]);
    const out = await dispatchSend(c, bundle.plan.id, { provider: "hubspot", to: "dana.whitfield@porchlight.example" });
    expect(out).toMatchObject({ ok: true, provider: "hubspot", externalId: "d1", url: "https://app.hubspot.example/deal/d1" });
    const events = await c.store.listEvents({ planId: bundle.plan.id, limit: 10 });
    expect(events.some((e) => e.provider === "hubspot" && e.direction === "out" && /Created HubSpot deal/.test(e.summary))).toBe(true);
  });

  it("Sheets send returns the sheet url", async () => {
    const out = await dispatchSend(ctx([{ id: "ca2", toolkit: "googlesheets" }]), bundle.plan.id, { provider: "google-sheets" });
    expect(out.url).toBe("https://docs.google.com/spreadsheets/d/sh1/edit");
  });

  it("OpenOOH send needs no account and returns the export url", async () => {
    const out = await dispatchSend(ctx([]), bundle.plan.id, { provider: "openooh" });
    expect(out.url).toBe(`https://wallspace.pages.dev/api/plans/${bundle.plan.id}/export.openooh.json`);
  });

  it("refuses with not_connected when the toolkit has no active account", async () => {
    await expect(dispatchSend(ctx([]), bundle.plan.id, { provider: "hubspot" })).rejects.toMatchObject({ code: "not_connected" });
  });

  it("rejects a bad recipient before calling any tool", async () => {
    await expect(dispatchSend(ctx([{ id: "ca1", toolkit: "hubspot" }]), bundle.plan.id, { provider: "hubspot", to: "nope" })).rejects.toBeTruthy();
  });

  it("surfaces a tool failure as a 502 tool_error", async () => {
    await expect(dispatchSend(ctx([{ id: "ca1", toolkit: "hubspot" }], TOOLS, false), bundle.plan.id, { provider: "hubspot" })).rejects.toMatchObject({ code: "tool_error", status: 502 });
  });
});

describe("pollRecords through the real adapter", () => {
  it("reports a disconnected provider as an error entry instead of throwing", async () => {
    await dispatchSend(ctx([{ id: "ca1", toolkit: "hubspot" }]), bundle.plan.id, { provider: "hubspot" });
    const r = await pollRecords(recordsDeps(ctx([])));
    expect(r.events).toEqual([]);
    expect(r.errors.join(" ")).toMatch(/hubspot deal d1: hubspot is not connected/);
  });

  it("reads a stage change back through the Composio client", async () => {
    await dispatchSend(ctx([{ id: "ca1", toolkit: "hubspot" }]), bundle.plan.id, { provider: "hubspot" });
    const moved = { ...TOOLS, HUBSPOT_GET_DEAL: { id: "d1", url: "https://app.hubspot.example/deal/d1", properties: { dealstage: "closedwon", amount: "39600" } } };
    const r = await pollRecords(recordsDeps(ctx([{ id: "ca1", toolkit: "hubspot" }], moved)), { planId: bundle.plan.id });
    expect(r.events.map((e) => e.summary)).toContain("HubSpot deal stage: Plan sent to Booked");
  });
});
