import { RECORD_TRIGGERS as TR, type RecordsProvider } from "@/contract/connectors-records";
import type { RecordsDeps } from "./types";
import { errorMessage, logEvent } from "./util";

export const SHEET_TRIGGER_INTERVAL_MIN = 2; // Composio's floor on managed auth

// Best-effort and idempotent (upsert). Polling in pollRecords() is the backstop when a trigger cannot be created.
export async function ensureTrigger(
  deps: RecordsDeps, planId: string, provider: RecordsProvider, slug: string, config: Record<string, unknown>,
): Promise<void> {
  if (!deps.composio.upsertTrigger) return;
  try {
    await deps.composio.upsertTrigger(slug, config, provider);
  } catch (e) {
    await logEvent(deps, { planId, provider, direction: "out", kind: "error", summary: `Trigger ${slug} not created, falling back to poll: ${errorMessage(e)}`, ok: false });
  }
}

export const sheetTriggerConfig = (spreadsheetId: string, range: string) => ({ spreadsheet_id: spreadsheetId, range, interval: SHEET_TRIGGER_INTERVAL_MIN });
export const googleCalendarTriggerConfig = () => ({ calendarId: "primary", interval: 2, showDeleted: true });
export const SHEETS_TRIGGER = TR.sheetsRange;
export const GCAL_TRIGGER = TR.gcalSync;
export const OUTLOOK_TRIGGER = TR.outlookEventChange;
