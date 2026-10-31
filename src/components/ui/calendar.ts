// Date maths for the flight picker, all in UTC on ISO "YYYY-MM-DD" strings so time zones never shift a day.

export const DAY = 86_400_000;

export const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const fromIso = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, n: number) => toIso(fromIso(iso) + n * DAY);

/** Last day of a flight that starts on `start` and runs `weeks` whole weeks. */
export const flightEnd = (start: string, weeks: number) => addDays(start, weeks * 7 - 1);

/** Whole weeks that cover start..end inclusive (at least 1, at most 52). */
export function weeksBetween(start: string, end: string): number {
  const days = Math.round((fromIso(end) - fromIso(start)) / DAY) + 1;
  return Math.min(52, Math.max(1, Math.ceil(days / 7)));
}

/** The 6x7 grid of ISO dates for a month view, weeks starting Monday. `month` is 0-based. */
export function monthGrid(year: number, month: number): string[] {
  const first = Date.UTC(year, month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => toIso(first + (i - lead) * DAY));
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const yearFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const monthLabel = (year: number, month: number) => monthFmt.format(Date.UTC(year, month, 1));
export const longLabel = (iso: string) => longFmt.format(fromIso(iso));
export const rangeLabel = (start: string, end: string) => `${shortFmt.format(fromIso(start))} – ${yearFmt.format(fromIso(end))}`;
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromIso(s));
