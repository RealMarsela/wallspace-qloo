import type { RecordsProvider } from "@/contract/connectors-records";
import { NotConnectedError, type ComposioPort, type ToolResult } from "@/server/connectors/records/types";

// A fake Composio for the records providers. It keeps HubSpot, Sheets and calendar state in memory, answers the same
// tool slugs with the same response shapes the real tools return, and exposes helpers that act like a human in the
// customer's tool (move the deal stage, edit a sheet cell, reschedule an event, accept an invite).

type Args = Record<string, unknown>;
interface Deal { id: string; props: Record<string, string>; }
interface Sheet { id: string; title: string; tabs: Map<string, unknown[][]>; }
interface CalEvent { id: string; summary: string; start: string; end: string; status: "confirmed" | "cancelled"; attendees: { email: string; response: string }[]; }

const ok = (data: Args): ToolResult => ({ successful: true, data, error: null });
const fail = (error: string): ToolResult => ({ successful: false, data: {}, error });

export class MockComposio implements ComposioPort {
  calls: { slug: string; args: Args; provider: RecordsProvider }[] = [];
  triggers: { slug: string; config: Args; provider: RecordsProvider }[] = [];
  connected = new Set<RecordsProvider>(["hubspot", "google-sheets", "google-calendar", "outlook-calendar"]);
  failSlugs = new Set<string>();
  companies = new Map<string, string>();
  contacts = new Map<string, string>();
  deals = new Map<string, Deal>();
  notes: Args[] = [];
  sheets = new Map<string, Sheet>();
  gcal = new Map<string, CalEvent>();
  outlook = new Map<string, CalEvent>();
  private n = 0;
  private id(prefix: string): string { return `${prefix}${++this.n}`; }

  async upsertTrigger(slug: string, config: Args, provider: RecordsProvider): Promise<void> { this.triggers.push({ slug, config, provider }); }

  async execute(slug: string, args: Args, provider: RecordsProvider): Promise<ToolResult> {
    if (!this.connected.has(provider)) throw new NotConnectedError(provider);
    this.calls.push({ slug, args, provider });
    if (this.failSlugs.has(slug)) return fail(`${slug} failed (mock)`);
    switch (slug) {
      case "HUBSPOT_SEARCH_COMPANIES": {
        const value = String(((args.filterGroups as { filters: { value: string }[] }[])[0]?.filters[0]?.value) ?? "");
        const hit = [...this.companies].find(([, name]) => name === value);
        return ok({ total: hit ? 1 : 0, results: hit ? [{ id: hit[0], properties: { name: hit[1] } }] : [] });
      }
      case "HUBSPOT_CREATE_COMPANY": { const id = this.id("co"); this.companies.set(id, String(args.name)); return ok({ id, properties: { name: args.name } }); }
      case "HUBSPOT_UPSERT_CONTACTS": {
        const input = (args.inputs as { id: string }[])[0];
        const existing = [...this.contacts].find(([, email]) => email === input.id);
        const id = existing?.[0] ?? this.id("ct");
        this.contacts.set(id, input.id);
        return ok({ results: [{ id }] });
      }
      case "HUBSPOT_CREATE_DEAL": {
        const id = this.id("deal");
        const props: Record<string, string> = {};
        for (const k of ["dealname", "amount", "closedate", "dealstage", "pipeline", "description"]) if (args[k] !== undefined) props[k] = String(args[k]);
        this.deals.set(id, { id, props });
        return ok({ id, properties: props });
      }
      case "HUBSPOT_UPDATE_DEAL": {
        const d = this.deals.get(String(args.dealId));
        if (!d) return fail("deal not found");
        for (const [k, v] of Object.entries(args.properties as Args)) d.props[k] = String(v);
        return ok({ id: d.id, properties: d.props });
      }
      case "HUBSPOT_GET_DEAL": {
        const d = this.deals.get(String(args.dealId));
        return d ? ok({ id: d.id, url: `https://app.hubspot.example/contacts/1/deal/${d.id}`, properties: { ...d.props } }) : fail("deal not found");
      }
      case "HUBSPOT_CREATE_NOTE": this.notes.push(args); return ok({ id: this.id("note") });
      case "GOOGLESHEETS_SHEET_FROM_JSON": {
        const id = this.id("sheet");
        const rows = args.sheet_json as Record<string, unknown>[];
        const header = Object.keys(rows[0] ?? {});
        this.sheets.set(id, { id, title: String(args.title), tabs: new Map([[String(args.sheet_name), [header, ...rows.map((r) => header.map((h) => r[h]))]]]) });
        return ok({ spreadsheetId: id, display_url: `https://docs.google.com/spreadsheets/d/${id}/edit` });
      }
      case "GOOGLESHEETS_ADD_SHEET": { this.sheets.get(String(args.spreadsheet_id))?.tabs.set(String(args.title), []); return ok({ spreadsheetId: args.spreadsheet_id }); }
      case "GOOGLESHEETS_CLEAR_VALUES": { this.sheets.get(String(args.spreadsheet_id))?.tabs.set(String(args.range).split("!")[0], []); return ok({}); }
      case "GOOGLESHEETS_BATCH_UPDATE": { this.sheets.get(String(args.spreadsheet_id))?.tabs.set(String(args.sheet_name), args.values as unknown[][]); return ok({}); }
      case "GOOGLESHEETS_VALUES_GET": {
        const tab = String(args.range).split("!")[0];
        return ok({ range: args.range, values: this.sheets.get(String(args.spreadsheet_id))?.tabs.get(tab) ?? [] });
      }
      case "GOOGLECALENDAR_CREATE_EVENT": return ok(this.createEvent(this.gcal, "gcal", args, String(args.summary), args.start_date, args.end_date, args.attendees as string[] | undefined));
      case "GOOGLECALENDAR_PATCH_EVENT": return this.patchEvent(this.gcal, args, "summary", "start_time", "end_time");
      case "GOOGLECALENDAR_EVENTS_GET": return this.getEvent(this.gcal, args.event_id, "google");
      case "OUTLOOK_CALENDAR_CREATE_EVENT": return ok(this.createEvent(this.outlook, "out", args, String(args.subject), String(args.start_datetime).slice(0, 10), String(args.end_datetime).slice(0, 10), args.attendees_info as string[] | undefined));
      case "OUTLOOK_UPDATE_CALENDAR_EVENT": return this.patchEvent(this.outlook, args, "subject", "start_datetime", "end_datetime");
      case "OUTLOOK_GET_EVENT": return this.getEvent(this.outlook, args.event_id, "outlook");
      default: return fail(`unknown tool ${slug}`);
    }
  }

  private createEvent(store: Map<string, CalEvent>, prefix: string, _args: Args, summary: string, start: unknown, end: unknown, attendees?: string[]): Args {
    const id = this.id(prefix);
    store.set(id, { id, summary, start: String(start), end: String(end), status: "confirmed", attendees: (attendees ?? []).map((email) => ({ email, response: "none" })) });
    return prefix === "gcal" ? { response_data: { id, htmlLink: `https://calendar.google.example/event?eid=${id}` }, display_url: `https://calendar.google.example/event?eid=${id}` } : { id, webLink: `https://outlook.office.example/calendar/item/${id}` };
  }

  private patchEvent(store: Map<string, CalEvent>, args: Args, titleKey: string, startKey: string, endKey: string): ToolResult {
    const e = store.get(String(args.event_id));
    if (!e) return fail("event not found");
    if (typeof args[titleKey] === "string") e.summary = args[titleKey] as string;
    if (typeof args[startKey] === "string") e.start = (args[startKey] as string).slice(0, 10);
    if (typeof args[endKey] === "string") e.end = (args[endKey] as string).slice(0, 10);
    return ok({ id: e.id });
  }

  private getEvent(store: Map<string, CalEvent>, id: unknown, shape: "google" | "outlook"): ToolResult {
    const e = store.get(String(id));
    if (!e) return fail("event not found");
    if (shape === "google") {
      return ok({
        id: e.id, summary: e.summary, status: e.status, htmlLink: `https://calendar.google.example/event?eid=${e.id}`,
        start: { date: e.start }, end: { date: e.end },
        attendees: [{ email: "organizer@wallspace.example", organizer: true, self: true }, ...e.attendees.map((a) => ({ email: a.email, responseStatus: a.response === "none" ? "needsAction" : a.response }))],
      });
    }
    return ok({
      id: e.id, subject: e.summary, isCancelled: e.status === "cancelled", webLink: `https://outlook.office.example/calendar/item/${e.id}`,
      start: { dateTime: `${e.start}T05:00:00.0000000`, timeZone: "UTC" }, end: { dateTime: `${e.end}T05:00:00.0000000`, timeZone: "UTC" },
      attendees: e.attendees.map((a) => ({ emailAddress: { address: a.email }, status: { response: a.response === "none" ? "notResponded" : a.response } })),
    });
  }

  // Human actions in the customer's tools.
  setDealStage(dealId: string, stage: string): void { const d = this.deals.get(dealId); if (d) d.props.dealstage = stage; }
  editSheetCell(sheetId: string, tab: string, faceId: string, column: string, value: unknown): void {
    const rows = this.sheets.get(sheetId)?.tabs.get(tab) ?? [];
    const c = rows[0]?.indexOf(column) ?? -1;
    const row = rows.find((r) => r[1] === faceId);
    if (row && c >= 0) row[c] = value;
  }
  moveEvent(store: "gcal" | "outlook", id: string, start: string, end: string): void { const e = (store === "gcal" ? this.gcal : this.outlook).get(id); if (e) { e.start = start; e.end = end; } }
  respond(store: "gcal" | "outlook", id: string, email: string, response: string): void { const a = (store === "gcal" ? this.gcal : this.outlook).get(id)?.attendees.find((x) => x.email === email); if (a) a.response = response; }
  cancel(store: "gcal" | "outlook", id: string): void { const e = (store === "gcal" ? this.gcal : this.outlook).get(id); if (e) e.status = "cancelled"; }
}
