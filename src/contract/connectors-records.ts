import { z } from "zod";
import { PlanResponse, SendPlanResponse } from "./api";

// Records connectors (lane B4): the campaign record (HubSpot), the plan sheet (Google Sheets), flight dates
// (Google Calendar, Outlook Calendar) and the OpenOOH deal-request export. All Composio-backed except OpenOOH.
// Provider-neutral shapes (Connection, SendPlanRequest) stay in domain.ts and api.ts.

export const RecordsProvider = z.enum(["hubspot", "google-sheets", "google-calendar", "outlook-calendar", "openooh"]);
export type RecordsProvider = z.infer<typeof RecordsProvider>;

// One row per external object a plan owns in a customer tool (D1 table record_links).
export const RecordLinkKind = z.enum([
  "company", "contact", "deal", "note", "spreadsheet", "event-creative", "event-posting", "event-takedown",
]);
export type RecordLinkKind = z.infer<typeof RecordLinkKind>;

export const RecordLink = z.object({
  planId: z.string(),
  provider: RecordsProvider,
  kind: RecordLinkKind,
  externalId: z.string(),
  url: z.string().nullable(),
  snapshot: z.record(z.string(), z.unknown()).nullable(), // last state read from the provider, for poll diffing
  updatedAt: z.string(),
});
export type RecordLink = z.infer<typeof RecordLink>;

export const RecordEventKind = z.enum([
  "deal-created", "deal-updated", "deal-stage", "sheet-exported", "sheet-edit",
  "calendar-created", "calendar-updated", "calendar-change", "calendar-cancelled", "openooh-exported", "error",
]);
export type RecordEventKind = z.infer<typeof RecordEventKind>;

// Sync log row (D1 table record_sync_log). Also forwarded to the shared plan event log when the host wires `emit`.
export const RecordEvent = z.object({
  id: z.string(),
  planId: z.string(),
  provider: RecordsProvider,
  direction: z.enum(["out", "in"]),
  kind: RecordEventKind,
  summary: z.string(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  ok: z.boolean(),
  at: z.string(),
});
export type RecordEvent = z.infer<typeof RecordEvent>;

// Composio tool slugs, verified against GET /api/v3.1/tools/{slug} on 30 Oct 2026.
export const RECORD_TOOLS = {
  hubspotSearchCompanies: "HUBSPOT_SEARCH_COMPANIES",
  hubspotCreateCompany: "HUBSPOT_CREATE_COMPANY",
  hubspotUpsertContacts: "HUBSPOT_UPSERT_CONTACTS",
  hubspotCreateDeal: "HUBSPOT_CREATE_DEAL",
  hubspotUpdateDeal: "HUBSPOT_UPDATE_DEAL",
  hubspotGetDeal: "HUBSPOT_GET_DEAL",
  hubspotCreateNote: "HUBSPOT_CREATE_NOTE",
  sheetsFromJson: "GOOGLESHEETS_SHEET_FROM_JSON",
  sheetsAddSheet: "GOOGLESHEETS_ADD_SHEET",
  sheetsClear: "GOOGLESHEETS_CLEAR_VALUES",
  sheetsBatchUpdate: "GOOGLESHEETS_BATCH_UPDATE",
  sheetsValuesGet: "GOOGLESHEETS_VALUES_GET",
  gcalCreate: "GOOGLECALENDAR_CREATE_EVENT",
  gcalPatch: "GOOGLECALENDAR_PATCH_EVENT",
  gcalEventsList: "GOOGLECALENDAR_EVENTS_LIST",
  outlookCalCreate: "OUTLOOK_CALENDAR_CREATE_EVENT",
  outlookCalUpdate: "OUTLOOK_UPDATE_CALENDAR_EVENT",
  outlookGetEvent: "OUTLOOK_GET_EVENT",
} as const;

export const RECORD_TRIGGERS = {
  sheetsRange: "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER", // poll, payload carries previous_values and current_values
  gcalSync: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_SYNC_TRIGGER", // poll, full event with created/updated/deleted
  outlookEventChange: "OUTLOOK_EVENT_CHANGE_TRIGGER", // webhook, payload { id, event_type } only
  outlookEvent: "OUTLOOK_EVENT_TRIGGER", // webhook
} as const;

// HubSpot default sales pipeline. Stage ids are HubSpot's own; a fresh account has this pipeline.
export const HUBSPOT_PIPELINE = "default";
export const HUBSPOT_STAGES = {
  appointmentscheduled: "Plan sent",
  qualifiedtobuy: "In review",
  presentationscheduled: "Presented",
  decisionmakerboughtin: "Approved by client",
  contractsent: "Booking contract sent",
  closedwon: "Booked",
  closedlost: "Lost",
} as const;
export const STAGE_ON_SEND = "appointmentscheduled";
export const STAGE_ON_APPROVE = "decisionmakerboughtin";

export const FLIGHT_TIME_ZONE = "America/New_York"; // demo city is Atlanta
export const CREATIVE_LEAD_DAYS = 10;

// Faces sheet columns, in order. Editable by the planner: costUsd, chosenCopy.
export const SHEET_FACES_TAB = "Faces";
export const SHEET_SUMMARY_TAB = "Summary";
export const SHEET_FACE_COLUMNS = [
  "Rank", "Face ID", "Kind", "Venue type (OpenOOH)", "Street", "Neighbourhood", "Lat", "Lng", "Affinity",
  "Cost USD", "Chosen copy", "Copy line 1", "Copy line 2", "Copy line 3", "Guard", "Flags",
] as const;
export const SHEET_EDITABLE = ["Cost USD", "Chosen copy"] as const;

// Request bodies for the records routes. `to` is the client contact for CRM and calendar attendees.
export const RecordsSendInput = z.object({
  planId: z.string().min(1),
  to: z.string().email().nullish(),
  note: z.string().max(2000).nullish(),
});
export type RecordsSendInput = z.infer<typeof RecordsSendInput>;

// Inbound read-back results (what pollRecords and the webhook handlers return).
export const PollResult = z.object({
  checked: z.number().int(),
  events: z.array(RecordEvent),
  errors: z.array(z.string()),
});
export type PollResult = z.infer<typeof PollResult>;

// A change a planner made in the sheet. The host may apply it to the plan; the event log always records it.
export const SheetEdit = z.object({
  planId: z.string(),
  faceId: z.string(),
  field: z.enum(["costUsd", "chosenCopy"]),
  from: z.union([z.string(), z.number(), z.null()]),
  to: z.union([z.string(), z.number(), z.null()]),
});
export type SheetEdit = z.infer<typeof SheetEdit>;

// Export urls: GET /api/plans/:id/export.openooh.json
export const OPENOOH_EXPORT_ROUTE = "GET /api/plans/:id/export.openooh.json";

// API contract has schemas only; these are the inferred types the records connectors share.
export type PlanData = Pick<z.infer<typeof PlanResponse>, "plan" | "brief" | "faces">;
export type SendResult = z.infer<typeof SendPlanResponse>;
