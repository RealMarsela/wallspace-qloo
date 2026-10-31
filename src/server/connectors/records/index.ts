import {
  RECORD_TRIGGERS as TR, RecordsProvider, type PlanData, type PollResult, type RecordEvent, type RecordsSendInput, type SendResult,
} from "@/contract/connectors-records";
import { markDealApproved, pollHubspot, sendToHubspot } from "../crm/hubspot";
import { handleGoogleCalendarTrigger, handleOutlookEventTrigger, pollCalendar, sendToCalendar } from "../calendar/calendar";
import { diffSheet, exportToSheets, pollSheets } from "../docs/sheets";
import { openOohUrl } from "./dates";
import { planToOpenOoh } from "../ooh/openooh";
import type { RecordsDeps } from "./types";
import { errorMessage, get, logEvent } from "./util";

// Static facts the connections aggregator shows for each records provider.
export const RECORDS_CONNECTIONS = {
  hubspot: { category: "crm", name: "HubSpot", realtime: "poll", composioToolkit: "hubspot", authConfig: "wallspace-hubspot" },
  "google-sheets": { category: "docs", name: "Google Sheets", realtime: "trigger", composioToolkit: "googlesheets", authConfig: "wallspace-googlesheets" },
  "google-calendar": { category: "calendar", name: "Google Calendar", realtime: "trigger", composioToolkit: "googlecalendar", authConfig: "wallspace-googlecalendar" },
  "outlook-calendar": { category: "calendar", name: "Outlook Calendar", realtime: "webhook", composioToolkit: "outlook", authConfig: "wallspace-outlook" },
  openooh: { category: "ooh", name: "OpenOOH deal request", realtime: "none", composioToolkit: null, authConfig: null },
} as const;

// POST /api/plans/:id/send for the records providers. `plan` is the loaded PlanResponse (B3's dispatcher loads it).
export async function sendRecords(
  deps: RecordsDeps, provider: RecordsProvider, data: PlanData, extra: Pick<RecordsSendInput, "to" | "note">,
): Promise<SendResult> {
  switch (provider) {
    case "hubspot":
      return sendToHubspot(deps, { ...data, ...extra });
    case "google-sheets":
      return exportToSheets(deps, data);
    case "google-calendar":
    case "outlook-calendar":
      return sendToCalendar(deps, provider, { ...data, to: extra.to });
    case "openooh": {
      const doc = planToOpenOoh({ ...data, appUrl: deps.appUrl, now: deps.now?.() });
      const url = openOohUrl(deps.appUrl, data.plan.id);
      await logEvent(deps, {
        planId: data.plan.id, provider, direction: "out", kind: "openooh-exported",
        summary: `Prepared OpenOOH deal request: ${doc.venues.length} venues tagged with OpenOOH ${doc.standards.openoohVenueTaxonomy} venue types`,
        detail: { url, venues: doc.venues.length },
      });
      return { ok: true, provider, externalId: doc.deal.id, url };
    }
  }
}

// Client approved the plan in Wallspace: advance the CRM deal. Safe to call when HubSpot is not connected.
export async function onPlanApproved(deps: RecordsDeps, planId: string): Promise<void> {
  try {
    await markDealApproved(deps, planId);
  } catch (e) {
    await logEvent(deps, { planId, provider: "hubspot", direction: "out", kind: "error", summary: `HubSpot approve sync failed: ${errorMessage(e)}`, ok: false });
  }
}

// The one function B1's scheduled handler calls (alongside the nightly re-scan) and the "Sync now" routes call.
// Every provider is polled independently, so one disconnected tool never blocks the others.
export async function pollRecords(deps: RecordsDeps, opts: { planId?: string } = {}): Promise<PollResult> {
  const parts = await Promise.all([
    pollHubspot(deps).catch((e) => ({ checked: 0, events: [] as RecordEvent[], errors: [`hubspot: ${errorMessage(e)}`] })),
    pollSheets(deps, opts.planId).catch((e) => ({ checked: 0, events: [] as RecordEvent[], errors: [`sheets: ${errorMessage(e)}`] })),
    pollCalendar(deps).catch((e) => ({ checked: 0, events: [] as RecordEvent[], errors: [`calendar: ${errorMessage(e)}`] })),
  ]);
  const events = parts.flatMap((p) => p.events).filter((e) => !opts.planId || e.planId === opts.planId);
  return { checked: parts.reduce((n, p) => n + p.checked, 0), events, errors: parts.flatMap((p) => p.errors) };
}

// Composio webhook registry entry: called by B3's receiver with the trigger slug and `data` for our triggers.
export const RECORDS_TRIGGER_SLUGS: readonly string[] = [TR.sheetsRange, TR.gcalSync, TR.outlookEventChange, TR.outlookEvent];

export async function handleRecordsTrigger(deps: RecordsDeps, triggerSlug: string, data: Record<string, unknown>): Promise<RecordEvent[]> {
  switch (triggerSlug) {
    case TR.sheetsRange: {
      const id = typeof data.spreadsheet_id === "string" ? data.spreadsheet_id : null;
      const link = id ? (await deps.store.linksByProvider("google-sheets")).find((l) => l.kind === "spreadsheet" && l.externalId === id) : undefined;
      const values = get(data, ["current_values"]);
      return link && Array.isArray(values) ? diffSheet(deps, link, values as unknown[][]) : [];
    }
    case TR.gcalSync:
      return [await handleGoogleCalendarTrigger(deps, data)].filter((e): e is RecordEvent => e !== null);
    case TR.outlookEventChange:
    case TR.outlookEvent:
      return [await handleOutlookEventTrigger(deps, data)].filter((e): e is RecordEvent => e !== null);
    default:
      return [];
  }
}

export { RecordsProvider };
