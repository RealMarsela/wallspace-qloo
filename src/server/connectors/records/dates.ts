import { CREATIVE_LEAD_DAYS } from "@/contract/connectors-records";

// Calendar-date arithmetic on ISO dates (YYYY-MM-DD) in UTC, so results never shift with the host time zone.
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface FlightDates {
  creativeDue: string; // flight start minus the creative lead time
  posting: string; // flight start
  takedown: string; // flight start plus the weeks of the flight
}

export function flightDates(flightStart: string, flightWeeks: number): FlightDates {
  const posting = flightStart.slice(0, 10);
  return { creativeDue: addDays(posting, -CREATIVE_LEAD_DAYS), posting, takedown: addDays(posting, flightWeeks * 7) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthYear(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

// "Porchlight Comedy Tour (sample brand)" -> "Porchlight Comedy Tour". The sample label stays in notes and sheets.
export function plainBrand(name: string): string {
  return name.replace(/\s*\((sample brand|sample)\)\s*$/i, "").trim();
}

export function planUrl(appUrl: string, planId: string): string {
  return `${appUrl.replace(/\/$/, "")}/app/plans/${encodeURIComponent(planId)}`;
}

export function openOohUrl(appUrl: string, planId: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/plans/${encodeURIComponent(planId)}/export.openooh.json`;
}

export function dealName(brandName: string, flightStart: string): string {
  return `${plainBrand(brandName)} · Atlanta OOH · ${monthYear(flightStart)}`;
}
