import { describe, expect, it } from "vitest";
import { SHEET_FACE_COLUMNS, RecordsSendInput } from "@/contract/connectors-records";
import { SAMPLE_CLIENT_EMAIL } from "@/mocks/connectors-records";
import { NotConnectedError } from "./types";
import { planToEvents } from "../calendar/mapper";
import { handleGoogleCalendarTrigger, handleOutlookEventTrigger, pollCalendar, sendToCalendar } from "../calendar/calendar";
import { planToSheet } from "../docs/mapper";
import { exportToSheets, pollSheets } from "../docs/sheets";
import { flightDates } from "./dates";
import { handleRecordsTrigger, onPlanApproved, pollRecords, sendRecords } from "./index";
import { harness } from "./harness";

describe("plan -> sheet mapper", () => {
  const { data } = harness();
  const x = planToSheet(data, "https://wallspace.pages.dev");
  it("has one row per face with every required column", () => {
    expect(x.faceRows).toHaveLength(data.plan.picks.length);
    expect(x.facesValues[0]).toEqual([...SHEET_FACE_COLUMNS]);
    const first = x.faceRows[0];
    expect(first.Rank).toBe(1);
    expect(first["Face ID"]).toBe("ATL-0412");
    expect(first["Venue type (OpenOOH)"]).toBe("301 Billboard");
    expect(first.Neighbourhood).toBe("Little Five Points");
    expect(first["Chosen copy"]).toBe("Little Five laughs louder. Nov 21.");
    expect(String(first.Guard)).toMatch(/pass \(live\)/);
    expect(String(first.Flags)).toMatch(/sample rate/);
    expect(typeof first.Lat).toBe("number");
  });
  it("has a summary with the budget split and honest labels", () => {
    const flat = x.summaryValues.map((r) => r.join("|")).join("\n");
    expect(flat).toContain("Budget split");
    for (const s of data.plan.split) expect(flat).toContain(s.neighbourhood);
    expect(flat).toContain("Honest labels");
  });
});

describe("flight dates and calendar mapper", () => {
  it("creative due is start minus 10 days, takedown is start plus weeks", () => {
    expect(flightDates("2026-11-16", 4)).toEqual({ creativeDue: "2026-11-06", posting: "2026-11-16", takedown: "2026-12-14" });
    expect(flightDates("2026-03-01", 2).creativeDue).toBe("2026-02-19");
  });
  it("makes three all-day events with exclusive end dates", () => {
    const evs = planToEvents(harness().data, "https://wallspace.pages.dev");
    expect(evs.map((e) => [e.kind, e.startDate, e.endDate])).toEqual([
      ["event-creative", "2026-11-06", "2026-11-07"], ["event-posting", "2026-11-16", "2026-11-17"], ["event-takedown", "2026-12-14", "2026-12-15"],
    ]);
    expect(evs[1].title).toBe("Posting starts · Porchlight Comedy Tour · Atlanta OOH · Nov 2026");
  });
});

describe("Google Sheets connector on the mock", () => {
  it("exports two tabs, returns the url and registers a trigger", async () => {
    const { deps, composio, data } = harness();
    const res = await exportToSheets(deps, data);
    expect(res.url).toMatch(/^https:\/\/docs\.google\.com\/spreadsheets\/d\//);
    const sheet = composio.sheets.get(res.externalId!)!;
    expect([...sheet.tabs.keys()]).toEqual(["Faces", "Summary"]);
    expect(sheet.tabs.get("Faces")).toHaveLength(data.plan.picks.length + 1);
    expect(composio.triggers[0]).toMatchObject({ slug: "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER", provider: "google-sheets" });
    expect(composio.calls.find((c) => c.slug === "GOOGLESHEETS_BATCH_UPDATE")!.args.value_input_option).toBe("RAW");
  });

  it("re-export rewrites the same sheet", async () => {
    const { deps, composio, data } = harness();
    await exportToSheets(deps, data);
    await exportToSheets(deps, data);
    expect(composio.sheets.size).toBe(1);
    expect(composio.calls.filter((c) => c.slug === "GOOGLESHEETS_SHEET_FROM_JSON")).toHaveLength(1);
  });

  it("reads a planner's cost and copy edits back into the event log and the plan hook, once", async () => {
    const applied: unknown[] = [];
    const { deps, composio, data, planId } = harness({ applySheetEdit: async (e) => void applied.push(e) });
    const { externalId } = await exportToSheets(deps, data);
    composio.editSheetCell(externalId!, "Faces", "ATL-0412", "Cost USD", 5900);
    composio.editSheetCell(externalId!, "Faces", "ATL-0388", "Chosen copy", "Laugh at the light.");
    const r = await pollSheets(deps, planId);
    expect(r.events.map((e) => e.summary)).toEqual([
      "Sheet edit: ATL-0412 cost $6,200 to $5,900",
      "Sheet edit: ATL-0388 copy \"Ponce, the punchline's two stops away.\" to \"Laugh at the light.\"",
    ]);
    expect(applied).toHaveLength(2);
    expect((await pollSheets(deps, planId)).events).toHaveLength(0);
  });

  it("ignores edits to read-only columns and reports a broken layout", async () => {
    const { deps, composio, data, planId } = harness();
    const { externalId } = await exportToSheets(deps, data);
    composio.editSheetCell(externalId!, "Faces", "ATL-0412", "Neighbourhood", "Somewhere else");
    expect((await pollSheets(deps, planId)).events).toHaveLength(0);
    composio.sheets.get(externalId!)!.tabs.set("Faces", [["Oops"], ["x"]]);
    expect((await pollSheets(deps, planId)).events[0]).toMatchObject({ kind: "error", ok: false });
  });
});

describe.each([["google-calendar", "gcal"], ["outlook-calendar", "outlook"]] as const)("%s connector on the mock", (provider, store) => {
  const events = (c: ReturnType<typeof harness>["composio"]) => (store === "gcal" ? c.gcal : c.outlook);

  it("creates creative, posting and takedown events with the client as attendee", async () => {
    const { deps, composio, data } = harness();
    const res = await sendToCalendar(deps, provider, { ...data, to: SAMPLE_CLIENT_EMAIL });
    expect(res.url).toBeTruthy();
    const all = [...events(composio).values()];
    expect(all.map((e) => e.start)).toEqual(["2026-11-06", "2026-11-16", "2026-12-14"]);
    expect(all.every((e) => e.attendees[0]?.email === SAMPLE_CLIENT_EMAIL)).toBe(true);
    expect(composio.triggers).toHaveLength(1);
  });

  it("re-send patches in place", async () => {
    const { deps, composio, data } = harness();
    await sendToCalendar(deps, provider, { ...data, to: SAMPLE_CLIENT_EMAIL });
    await sendToCalendar(deps, provider, { ...data, to: SAMPLE_CLIENT_EMAIL });
    expect(events(composio).size).toBe(3);
  });

  it("poll reports a reschedule, an acceptance and a cancellation as inbound events, each once", async () => {
    const { deps, composio, data, planId } = harness();
    await sendToCalendar(deps, provider, { ...data, to: SAMPLE_CLIENT_EMAIL });
    expect((await pollCalendar(deps, provider)).events).toHaveLength(0);
    const [creative, posting] = [...events(composio).keys()];
    composio.moveEvent(store, posting, "2026-11-23", "2026-11-24");
    composio.respond(store, creative, SAMPLE_CLIENT_EMAIL, "accepted");
    composio.cancel(store, [...events(composio).keys()][2]);
    const r = await pollCalendar(deps, provider);
    expect(r.events.map((e) => e.summary).join("\n")).toMatch(/posting event moved to 2026-11-23/);
    expect(r.events.map((e) => e.summary).join("\n")).toMatch(/dana\.whitfield@porchlight\.example accepted/);
    expect(r.events.some((e) => e.kind === "calendar-cancelled")).toBe(true);
    expect(r.events.every((e) => e.direction === "in" && e.planId === planId)).toBe(true);
    expect((await pollCalendar(deps, provider)).events).toHaveLength(0);
  });
});

describe("webhook and trigger handlers", () => {
  it("Outlook event trigger fetches the event and logs a change; foreign events are ignored", async () => {
    const { deps, composio, data } = harness();
    await sendToCalendar(deps, "outlook-calendar", { ...data, to: SAMPLE_CLIENT_EMAIL });
    const id = [...composio.outlook.keys()][1];
    composio.moveEvent("outlook", id, "2026-11-20", "2026-11-21");
    const ev = await handleOutlookEventTrigger(deps, { id, event_type: "updated" });
    expect(ev?.summary).toMatch(/moved to 2026-11-20/);
    expect(await handleOutlookEventTrigger(deps, { id: "someone-elses-event", event_type: "updated" })).toBeNull();
  });

  it("Google sync trigger payload updates state without another tool call", async () => {
    const { deps, composio, data } = harness();
    await sendToCalendar(deps, "google-calendar", { ...data, to: SAMPLE_CLIENT_EMAIL });
    const id = [...composio.gcal.keys()][1];
    const before = composio.calls.length;
    const ev = await handleGoogleCalendarTrigger(deps, { event_id: id, event_type: "updated", summary: "Posting starts", start_time: "2026-11-30", end_time: "2026-12-01", status: "confirmed", attendees: [] });
    expect(ev?.summary).toMatch(/moved to 2026-11-30/);
    expect(composio.calls.length).toBe(before);
  });

  it("routes the sheet range trigger by slug and diffs the delivered values", async () => {
    const { deps, composio, data } = harness();
    const { externalId } = await exportToSheets(deps, data);
    composio.editSheetCell(externalId!, "Faces", "ATL-0412", "Cost USD", 5000);
    const values = composio.sheets.get(externalId!)!.tabs.get("Faces");
    const evs = await handleRecordsTrigger(deps, "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER", { spreadsheet_id: externalId, current_values: values });
    expect(evs[0]).toMatchObject({ kind: "sheet-edit", direction: "in" });
    expect(await handleRecordsTrigger(deps, "SOMETHING_ELSE", {})).toEqual([]);
  });
});

describe("dispatcher, poll and validation", () => {
  it("sendRecords covers every provider, including OpenOOH", async () => {
    const { deps, data } = harness();
    for (const p of ["hubspot", "google-sheets", "google-calendar", "outlook-calendar", "openooh"] as const) {
      const r = await sendRecords(deps, p, data, { to: SAMPLE_CLIENT_EMAIL });
      expect(r).toMatchObject({ ok: true, provider: p });
    }
    const oo = await sendRecords(deps, "openooh", data, {});
    expect(oo.url).toBe(`https://wallspace.pages.dev/api/plans/${data.plan.id}/export.openooh.json`);
  });

  it("pollRecords aggregates and isolates a disconnected provider", async () => {
    const { deps, composio, data } = harness();
    await sendRecords(deps, "hubspot", data, {});
    await sendRecords(deps, "google-sheets", data, {});
    composio.setDealStage([...composio.deals.keys()][0], "contractsent");
    composio.connected.delete("google-sheets");
    const r = await pollRecords(deps);
    expect(r.events.some((e) => e.kind === "deal-stage")).toBe(true);
    expect(r.errors.join(" ")).toMatch(/google-sheets is not connected/);
  });

  it("a send on a disconnected provider fails with NotConnectedError and logs it", async () => {
    const { deps, composio, data, store } = harness();
    composio.connected.clear();
    await expect(sendRecords(deps, "hubspot", data, {})).rejects.toBeInstanceOf(NotConnectedError);
    expect(store.events.at(-1)?.kind).toBe("error");
  });

  it("onPlanApproved never throws when HubSpot has no deal or is down", async () => {
    const { deps, composio, planId } = harness();
    await expect(onPlanApproved(deps, planId)).resolves.toBeUndefined();
    composio.connected.clear();
    await expect(onPlanApproved(deps, planId)).resolves.toBeUndefined();
  });

  it("validates the send input", () => {
    expect(RecordsSendInput.safeParse({ planId: "p1", to: "not-an-email" }).success).toBe(false);
    expect(RecordsSendInput.safeParse({ planId: "", to: null }).success).toBe(false);
    expect(RecordsSendInput.safeParse({ planId: "p1", to: SAMPLE_CLIENT_EMAIL, note: "hi" }).success).toBe(true);
    expect(RecordsSendInput.safeParse({ planId: "p1", note: "x".repeat(2001) }).success).toBe(false);
  });
});
