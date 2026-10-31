import { RecordEvent } from "@/contract/connectors-records";
import { samplePlanResponse } from "./plan-sample";

// Mocks for the records connectors: the in-memory store (vitest, DATA_MODE=mock), the sample plan bundle and the
// sample sync log the connections page shows before anything is connected. SAMPLE DATA throughout.

export const sampleRecordsPlan = samplePlanResponse;
export const SAMPLE_CLIENT_EMAIL = "dana.whitfield@porchlight.example";

export { createMemoryRecordsStore } from "@/server/connectors/records/memory-store";

// What /app/connections shows for the records providers while DATA_MODE=mock.
export const sampleRecordEvents: RecordEvent[] = [
  { id: "rec-1", planId: samplePlanResponse.plan.id, provider: "hubspot", direction: "out", kind: "deal-created", summary: 'Created HubSpot deal "Porchlight Comedy Tour · Atlanta OOH · Nov 2026" at Plan sent', detail: null, ok: true, at: "2026-10-30T09:10:00.000Z" },
  { id: "rec-2", planId: samplePlanResponse.plan.id, provider: "google-sheets", direction: "out", kind: "sheet-exported", summary: "Exported plan to Google Sheets: 8 faces, Summary tab with the budget split", detail: null, ok: true, at: "2026-10-30T09:11:00.000Z" },
  { id: "rec-3", planId: samplePlanResponse.plan.id, provider: "google-sheets", direction: "in", kind: "sheet-edit", summary: "Sheet edit: ATL-0412 cost $6,200 to $5,900", detail: null, ok: true, at: "2026-10-30T09:19:00.000Z" },
  { id: "rec-4", planId: samplePlanResponse.plan.id, provider: "google-calendar", direction: "out", kind: "calendar-created", summary: "Created 3 Google Calendar events: creative due, posting, takedown, invited dana.whitfield@porchlight.example", detail: null, ok: true, at: "2026-10-30T09:12:00.000Z" },
  { id: "rec-5", planId: samplePlanResponse.plan.id, provider: "hubspot", direction: "in", kind: "deal-stage", summary: "HubSpot deal stage: Plan sent to Approved by client", detail: null, ok: true, at: "2026-10-30T09:32:00.000Z" },
].map((e) => RecordEvent.parse(e));
