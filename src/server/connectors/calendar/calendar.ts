import { RECORD_TOOLS as T, type PlanData, type RecordEvent, type RecordLink, type RecordsProvider, type RecordsSendInput, type SendResult } from "@/contract/connectors-records";
import type { RecordsDeps } from "../records/types";
import { GCAL_TRIGGER, OUTLOOK_TRIGGER, ensureTrigger, googleCalendarTriggerConfig } from "../records/triggers";
import { ID_PATHS, errorMessage, firstString, logEvent, run, saveLink } from "../records/util";
import { googleCreateArgs, googlePatchArgs, outlookCreateArgs, outlookUpdateArgs, planToEvents, type EventDraft } from "./mapper";
import { describeChange, fromGoogle, fromGoogleTrigger, fromOutlook, stateOf, type EventState } from "./state";

export type CalendarProvider = Extract<RecordsProvider, "google-calendar" | "outlook-calendar">;

interface Adapter {
  label: string;
  create(d: EventDraft, attendee: string | null): [string, Record<string, unknown>];
  update(id: string, d: EventDraft): [string, Record<string, unknown>];
  read(id: string): [string, Record<string, unknown>];
  parse(raw: unknown): EventState | null;
  linkOf(raw: unknown): string | null;
}

const ADAPTERS: Record<CalendarProvider, Adapter> = {
  "google-calendar": {
    label: "Google Calendar",
    create: (d, a) => [T.gcalCreate, googleCreateArgs(d, a)],
    update: (id, d) => [T.gcalPatch, googlePatchArgs(id, d)],
    read: (id) => ["GOOGLECALENDAR_EVENTS_GET", { calendar_id: "primary", event_id: id }],
    parse: fromGoogle,
    linkOf: (raw) => firstString(raw, [["display_url"], ["response_data", "htmlLink"], ["htmlLink"]]),
  },
  "outlook-calendar": {
    label: "Outlook Calendar",
    create: (d, a) => [T.outlookCalCreate, outlookCreateArgs(d, a)],
    update: (id, d) => [T.outlookCalUpdate, outlookUpdateArgs(id, d)],
    read: (id) => [T.outlookGetEvent, { event_id: id, user_id: "me" }],
    parse: fromOutlook,
    linkOf: (raw) => firstString(raw, [["webLink"]]),
  },
};

const eventLinks = (links: RecordLink[]) => links.filter((l) => l.kind.startsWith("event-"));

// Send: create creative-due, posting and takedown events (attendee = client contact); a re-send patches them in place.
export async function sendToCalendar(
  deps: RecordsDeps, provider: CalendarProvider, input: PlanData & Pick<RecordsSendInput, "to">,
): Promise<SendResult> {
  const a = ADAPTERS[provider];
  const planId = input.plan.id;
  const attendee = input.to ?? null;
  try {
    const have = new Map(eventLinks(await deps.store.getLinks(planId, provider)).map((l) => [l.kind, l]));
    let postingId: string | null = null;
    let postingUrl: string | null = null;
    for (const d of planToEvents(input, deps.appUrl)) {
      const known = have.get(d.kind);
      let id: string;
      if (known) {
        id = known.externalId;
        const [slug, args] = a.update(id, d);
        await run(deps, slug, args, provider);
      } else {
        const [slug, args] = a.create(d, attendee);
        const res = await run(deps, slug, args, provider);
        const made = firstString(res.data, ID_PATHS);
        if (!made) throw new Error(`${a.label} returned no event id`);
        id = made;
      }
      const [rslug, rargs] = a.read(id);
      const read = await run(deps, rslug, rargs, provider);
      const url = a.linkOf(read.data) ?? known?.url ?? null;
      await saveLink(deps, { planId, provider, kind: d.kind, externalId: id, url, snapshot: (a.parse(read.data) ?? undefined) as Record<string, unknown> | undefined });
      if (d.kind === "event-posting") { postingId = id; postingUrl = url; }
    }
    if (!have.size) await ensureTrigger(deps, planId, provider, provider === "google-calendar" ? GCAL_TRIGGER : OUTLOOK_TRIGGER, provider === "google-calendar" ? googleCalendarTriggerConfig() : {});
    await logEvent(deps, {
      planId, provider, direction: "out", kind: have.size ? "calendar-updated" : "calendar-created",
      summary: `${have.size ? "Updated" : "Created"} 3 ${a.label} events: creative due, posting, takedown${attendee ? `, invited ${attendee}` : ""}`,
      detail: { posting: postingId, url: postingUrl },
    });
    return { ok: true, provider, externalId: postingId, url: postingUrl };
  } catch (e) {
    await logEvent(deps, { planId, provider, direction: "out", kind: "error", summary: `${a.label} send failed: ${errorMessage(e)}`, ok: false });
    throw e;
  }
}

async function applyState(deps: RecordsDeps, link: RecordLink, cur: EventState): Promise<RecordEvent | null> {
  const prev = stateOf(link.snapshot);
  if (!prev) {
    await saveLink(deps, { ...link, snapshot: cur as unknown as Record<string, unknown> });
    return null;
  }
  const changes = describeChange(prev, cur);
  if (!changes.length && JSON.stringify(prev) === JSON.stringify(cur)) return null;
  await saveLink(deps, { ...link, snapshot: cur as unknown as Record<string, unknown> });
  if (!changes.length) return null;
  const a = ADAPTERS[link.provider as CalendarProvider];
  const label = link.kind.replace("event-", "");
  return logEvent(deps, {
    planId: link.planId, provider: link.provider, direction: "in",
    kind: cur.status === "cancelled" ? "calendar-cancelled" : "calendar-change",
    summary: `${a.label} ${label} event ${changes.join(", ")}`,
    detail: { eventId: link.externalId, from: prev, to: cur },
  });
}

// Cron read-back (Google is poll-only; Outlook also has a webhook, see handleOutlookEventTrigger).
export async function pollCalendar(deps: RecordsDeps, provider?: CalendarProvider) {
  const events: RecordEvent[] = [];
  const errors: string[] = [];
  let checked = 0;
  for (const p of provider ? [provider] : (Object.keys(ADAPTERS) as CalendarProvider[])) {
    const a = ADAPTERS[p];
    for (const link of eventLinks(await deps.store.linksByProvider(p))) {
      checked++;
      try {
        const [slug, args] = a.read(link.externalId);
        const cur = a.parse((await run(deps, slug, args, p)).data);
        const ev = cur && (await applyState(deps, link, cur));
        if (ev) events.push(ev);
      } catch (e) {
        errors.push(`${p} ${link.externalId}: ${errorMessage(e)}`);
      }
    }
  }
  return { checked, events, errors };
}

async function findLink(deps: RecordsDeps, provider: CalendarProvider, eventId: string): Promise<RecordLink | undefined> {
  return eventLinks(await deps.store.linksByProvider(provider)).find((l) => l.externalId === eventId);
}

// Outlook webhook trigger (OUTLOOK_EVENT_CHANGE_TRIGGER / OUTLOOK_EVENT_TRIGGER): payload is only { id, event_type },
// so we fetch the event. Events that are not ours are ignored.
export async function handleOutlookEventTrigger(deps: RecordsDeps, payload: Record<string, unknown>): Promise<RecordEvent | null> {
  const id = typeof payload.id === "string" ? payload.id : null;
  const link = id ? await findLink(deps, "outlook-calendar", id) : undefined;
  if (!id || !link) return null;
  const [slug, args] = ADAPTERS["outlook-calendar"].read(id);
  const cur = fromOutlook((await run(deps, slug, args, "outlook-calendar")).data);
  return cur ? applyState(deps, link, cur) : null;
}

// Google Calendar poll trigger (GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_SYNC_TRIGGER): the payload is the full event.
export async function handleGoogleCalendarTrigger(deps: RecordsDeps, payload: Record<string, unknown>): Promise<RecordEvent | null> {
  const id = typeof payload.event_id === "string" ? payload.event_id : null;
  const link = id ? await findLink(deps, "google-calendar", id) : undefined;
  if (!id || !link) return null;
  return applyState(deps, link, fromGoogleTrigger(payload));
}

export const calendarProviderLabel = (p: CalendarProvider): string => ADAPTERS[p].label;
