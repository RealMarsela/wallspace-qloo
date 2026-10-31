import {
  RECORD_TOOLS as T, SHEET_FACES_TAB, SHEET_FACE_COLUMNS, SHEET_SUMMARY_TAB, type PlanData, type RecordEvent, type RecordLink, type SendResult, type SheetEdit,
} from "@/contract/connectors-records";
import type { RecordsDeps } from "../records/types";
import { SHEETS_TRIGGER, ensureTrigger, sheetTriggerConfig } from "../records/triggers";
import { ID_PATHS, errorMessage, firstString, get, logEvent, run, saveLink, usd } from "../records/util";
import { planToSheet, type SheetExport } from "./mapper";

const P = "google-sheets" as const;
const LAST_COL = "P"; // SHEET_FACE_COLUMNS has 16 columns
const READ_RANGE = `${SHEET_FACES_TAB}!A1:${LAST_COL}200`;

interface FaceState {
  costUsd: number;
  chosenCopy: string;
}
const snapshotOf = (x: SheetExport): Record<string, unknown> => ({
  faces: Object.fromEntries(x.faceRows.map((r) => [String(r["Face ID"]), { costUsd: Number(r["Cost USD"]), chosenCopy: String(r["Chosen copy"]) } satisfies FaceState])),
});

const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

async function writeTab(deps: RecordsDeps, spreadsheetId: string, tab: string, values: SheetExport["facesValues"]): Promise<void> {
  await run(deps, T.sheetsClear, { spreadsheet_id: spreadsheetId, range: `${tab}!A1:${LAST_COL}200` }, P);
  await run(deps, T.sheetsBatchUpdate, { spreadsheet_id: spreadsheetId, sheet_name: tab, first_cell_location: "A1", values, value_input_option: "RAW" }, P);
}

// Export the plan as a sheet: Faces tab (one row per face) and Summary tab (budget split). Re-export rewrites the same sheet.
export async function exportToSheets(deps: RecordsDeps, input: PlanData): Promise<SendResult> {
  const planId = input.plan.id;
  const x = planToSheet(input, deps.appUrl);
  try {
    const existing = (await deps.store.getLinks(planId, P)).find((l) => l.kind === "spreadsheet");
    let id: string;
    let url: string;
    if (existing) {
      id = existing.externalId;
      url = existing.url ?? sheetUrl(id);
      await writeTab(deps, id, SHEET_FACES_TAB, x.facesValues);
      await writeTab(deps, id, SHEET_SUMMARY_TAB, x.summaryValues);
    } else {
      const created = await run(deps, T.sheetsFromJson, { title: x.title, sheet_name: SHEET_FACES_TAB, sheet_json: x.faceRows }, P);
      const made = firstString(created.data, ID_PATHS);
      if (!made) throw new Error("Google Sheets returned no spreadsheet id");
      id = made;
      url = firstString(created.data, [["display_url"]]) ?? sheetUrl(id);
      await run(deps, T.sheetsAddSheet, { spreadsheet_id: id, title: SHEET_SUMMARY_TAB }, P);
      await run(deps, T.sheetsBatchUpdate, { spreadsheet_id: id, sheet_name: SHEET_SUMMARY_TAB, first_cell_location: "A1", values: x.summaryValues, value_input_option: "RAW" }, P);
    }
    await saveLink(deps, { planId, provider: P, kind: "spreadsheet", externalId: id, url, snapshot: snapshotOf(x) });
    await ensureTrigger(deps, planId, P, SHEETS_TRIGGER, sheetTriggerConfig(id, READ_RANGE));
    await logEvent(deps, {
      planId, provider: P, direction: "out", kind: "sheet-exported",
      summary: `${existing ? "Re-exported" : "Exported"} plan to Google Sheets: ${x.faceRows.length} faces, ${SHEET_SUMMARY_TAB} tab with the budget split`,
      detail: { spreadsheetId: id, url },
    });
    return { ok: true, provider: P, externalId: id, url };
  } catch (e) {
    await logEvent(deps, { planId, provider: P, direction: "out", kind: "error", summary: `Sheets export failed: ${errorMessage(e)}`, ok: false });
    throw e;
  }
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

// Diff sheet rows against the last snapshot. Cost and chosen copy are the planner-editable columns.
export async function diffSheet(deps: RecordsDeps, link: RecordLink, values: unknown[][]): Promise<RecordEvent[]> {
  const header = (values[0] ?? []).map((h) => String(h));
  const col = (name: string) => header.indexOf(name);
  const idCol = col("Face ID"), costCol = col("Cost USD"), copyCol = col("Chosen copy");
  if (idCol < 0 || costCol < 0 || copyCol < 0) {
    return [await logEvent(deps, { planId: link.planId, provider: P, direction: "in", kind: "error", summary: "Sheet layout changed: Face ID, Cost USD or Chosen copy column is missing", ok: false })];
  }
  const prev = (get(link.snapshot, ["faces"]) ?? {}) as Record<string, FaceState>;
  const next: Record<string, FaceState> = { ...prev };
  const edits: SheetEdit[] = [];
  const events: RecordEvent[] = [];
  for (const row of values.slice(1)) {
    const faceId = String(row[idCol] ?? "").trim();
    const before = prev[faceId];
    if (!faceId || !before) continue;
    const cost = num(row[costCol]);
    const copy = String(row[copyCol] ?? "");
    if (cost !== null && cost !== before.costUsd) edits.push({ planId: link.planId, faceId, field: "costUsd", from: before.costUsd, to: cost });
    if (copy !== before.chosenCopy) edits.push({ planId: link.planId, faceId, field: "chosenCopy", from: before.chosenCopy, to: copy });
    next[faceId] = { costUsd: cost ?? before.costUsd, chosenCopy: copy };
  }
  for (const e of edits) {
    const summary = e.field === "costUsd"
      ? `Sheet edit: ${e.faceId} cost ${usd(Number(e.from))} to ${usd(Number(e.to))}`
      : `Sheet edit: ${e.faceId} copy "${String(e.from)}" to "${String(e.to)}"`;
    events.push(await logEvent(deps, { planId: link.planId, provider: P, direction: "in", kind: "sheet-edit", summary, detail: { ...e } }));
    if (deps.applySheetEdit) await deps.applySheetEdit(e).catch(() => undefined);
  }
  if (edits.length) await saveLink(deps, { planId: link.planId, provider: P, kind: "spreadsheet", externalId: link.externalId, url: link.url, snapshot: { faces: next } });
  return events;
}

export async function readSheet(deps: RecordsDeps, link: RecordLink): Promise<RecordEvent[]> {
  const res = await run(deps, T.sheetsValuesGet, { spreadsheet_id: link.externalId, range: READ_RANGE, value_render_option: "UNFORMATTED_VALUE" }, P);
  const values = get(res.data, ["values"]) ?? get(res.data, ["response_data", "values"]);
  return diffSheet(deps, link, Array.isArray(values) ? (values as unknown[][]) : []);
}

// Cron read-back and the "Sync now" button.
export async function pollSheets(deps: RecordsDeps, planId?: string) {
  const links = (await deps.store.linksByProvider(P)).filter((l) => l.kind === "spreadsheet" && (!planId || l.planId === planId));
  const events: RecordEvent[] = [];
  const errors: string[] = [];
  for (const l of links) {
    try {
      events.push(...(await readSheet(deps, l)));
    } catch (e) {
      errors.push(`sheet ${l.externalId}: ${errorMessage(e)}`);
    }
  }
  return { checked: links.length, events, errors };
}

export const SHEET_COLUMN_COUNT = SHEET_FACE_COLUMNS.length;
