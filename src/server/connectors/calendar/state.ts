import { get } from "../records/util";

// A provider-neutral view of one calendar event, normalised from Google or Outlook so both diff the same way.
export interface EventState {
  title: string;
  start: string;
  end: string;
  status: "confirmed" | "cancelled";
  responses: Record<string, string>; // attendee email -> accepted | declined | tentative | none
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function fromGoogle(raw: unknown): EventState | null {
  const e = get(raw, ["response_data"]) ?? raw;
  if (!get(e, ["id"]) && !get(e, ["summary"])) return null;
  const when = (k: string) => str(get(e, [k, "date"])) || str(get(e, [k, "dateTime"])).slice(0, 16);
  const responses: Record<string, string> = {};
  const atts = get(e, ["attendees"]);
  if (Array.isArray(atts)) {
    for (const a of atts) {
      const email = str(get(a, ["email"])).toLowerCase();
      if (email && get(a, ["self"]) !== true && get(a, ["organizer"]) !== true) responses[email] = str(get(a, ["responseStatus"])).replace("needsAction", "none") || "none";
    }
  }
  return { title: str(get(e, ["summary"])), start: when("start"), end: when("end"), status: get(e, ["status"]) === "cancelled" ? "cancelled" : "confirmed", responses };
}

export function fromOutlook(raw: unknown): EventState | null {
  const e = get(raw, ["response_data"]) ?? raw;
  if (!get(e, ["id"]) && !get(e, ["subject"])) return null;
  const when = (k: string) => str(get(e, [k, "dateTime"])).slice(0, 16);
  const responses: Record<string, string> = {};
  const atts = get(e, ["attendees"]);
  if (Array.isArray(atts)) {
    for (const a of atts) {
      const email = str(get(a, ["emailAddress", "address"])).toLowerCase();
      if (email) responses[email] = str(get(a, ["status", "response"])).replace("notResponded", "none").replace("tentativelyAccepted", "tentative") || "none";
    }
  }
  return { title: str(get(e, ["subject"])), start: when("start"), end: when("end"), status: get(e, ["isCancelled"]) === true ? "cancelled" : "confirmed", responses };
}

// Google sync-trigger payload (start_time, end_time, status, summary, attendees[]).
export function fromGoogleTrigger(p: Record<string, unknown>): EventState {
  const responses: Record<string, string> = {};
  const atts = p.attendees;
  if (Array.isArray(atts)) {
    for (const a of atts) {
      const email = str(typeof a === "string" ? a : get(a, ["email"])).toLowerCase();
      if (email) responses[email] = str(get(a, ["responseStatus"])).replace("needsAction", "none") || "none";
    }
  }
  const cut = (v: unknown) => str(v).slice(0, str(v).includes("T") ? 16 : 10);
  return { title: str(p.summary), start: cut(p.start_time), end: cut(p.end_time), status: p.status === "cancelled" || p.event_type === "deleted" ? "cancelled" : "confirmed", responses };
}

export function stateOf(snapshot: Record<string, unknown> | null): EventState | null {
  if (!snapshot || typeof snapshot.title !== "string") return null;
  return snapshot as unknown as EventState;
}

// Human-readable list of what changed, empty when nothing a planner cares about changed.
export function describeChange(prev: EventState, cur: EventState): string[] {
  const out: string[] = [];
  if (cur.status !== prev.status) out.push(cur.status === "cancelled" ? "cancelled" : "restored");
  if (cur.start !== prev.start || cur.end !== prev.end) out.push(`moved to ${cur.start.slice(0, 10)}`);
  if (cur.title !== prev.title) out.push(`renamed "${cur.title}"`);
  for (const [email, resp] of Object.entries(cur.responses)) {
    const before = prev.responses[email] ?? "none";
    if (resp !== before && resp !== "none") out.push(`${email} ${resp}`);
  }
  return out;
}
