import { FLIGHT_TIME_ZONE, type PlanData, type RecordLinkKind } from "@/contract/connectors-records";
import { addDays, dealName, flightDates, planUrl } from "../records/dates";

export type CalendarKind = Extract<RecordLinkKind, "event-creative" | "event-posting" | "event-takedown">;

export interface EventDraft {
  kind: CalendarKind;
  title: string;
  description: string;
  startDate: string; // inclusive, YYYY-MM-DD
  endDate: string; // exclusive, YYYY-MM-DD (all-day events)
}

// Plan -> three all-day flight events: creative due (start minus 10 days), posting (flight start), takedown (start plus weeks).
export function planToEvents(input: PlanData, appUrl: string): EventDraft[] {
  const { plan, brief } = input;
  const dates = flightDates(brief.flightStart, brief.flightWeeks);
  const name = dealName(brief.brandName, brief.flightStart);
  const base = `${plan.picks.length} faces, flight ${dates.posting} to ${dates.takedown}.\nPlan: ${planUrl(appUrl, plan.id)}`;
  const sample = plan.sample || brief.brandSample ? "\nSample brand, faces and rates (demonstration data)." : "";
  const draft = (kind: CalendarKind, label: string, day: string, extra: string): EventDraft => ({
    kind, title: `${label} · ${name}`, description: `${extra}\n${base}${sample}`, startDate: day, endDate: addDays(day, 1),
  });
  return [
    draft("event-creative", "Creative due", dates.creativeDue, "Final creative files are due to the media owners 10 days before the flight."),
    draft("event-posting", "Posting starts", dates.posting, "Faces go up and the flight begins."),
    draft("event-takedown", "Takedown", dates.takedown, "Flight ends; faces come down."),
  ];
}

export function googleCreateArgs(d: EventDraft, attendee: string | null): Record<string, unknown> {
  return {
    calendar_id: "primary", summary: d.title, description: d.description, start_date: d.startDate, end_date: d.endDate,
    timezone: FLIGHT_TIME_ZONE, create_meeting_room: false, send_updates: attendee ? "all" : "none",
    ...(attendee ? { attendees: [attendee] } : {}),
  };
}

export function googlePatchArgs(eventId: string, d: EventDraft): Record<string, unknown> {
  return { calendar_id: "primary", event_id: eventId, summary: d.title, description: d.description, start_time: d.startDate, end_time: d.endDate, timezone: FLIGHT_TIME_ZONE, send_updates: "none" };
}

export function outlookCreateArgs(d: EventDraft, attendee: string | null): Record<string, unknown> {
  return {
    subject: d.title, body: d.description.replace(/\n/g, "<br>"), is_html: true, is_all_day: true,
    start_datetime: `${d.startDate}T00:00:00`, end_datetime: `${d.endDate}T00:00:00`, time_zone: FLIGHT_TIME_ZONE, show_as: "free",
    ...(attendee ? { attendees_info: [attendee] } : {}),
  };
}

export function outlookUpdateArgs(eventId: string, d: EventDraft): Record<string, unknown> {
  return {
    event_id: eventId, subject: d.title, body: { contentType: "HTML", content: d.description.replace(/\n/g, "<br>") },
    start_datetime: `${d.startDate}T00:00:00`, end_datetime: `${d.endDate}T00:00:00`, time_zone: FLIGHT_TIME_ZONE,
  };
}
