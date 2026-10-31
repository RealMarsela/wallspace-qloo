// Number and date formatting shared by every UI-A screen.

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const usd = (n: number) => usd0.format(n);

/** Model spend: cents below a dollar ("6¢", "0.4¢"), dollars above. */
export function cents(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  const c = n * 100;
  if (c >= 1) return `${c.toFixed(c >= 10 ? 0 : 1).replace(/\.0$/, "")}¢`;
  if (c === 0) return "0¢";
  return c < 0.01 ? "<0.01¢" : `${c.toFixed(2)}¢`;
}

export const pct = (share: number) => `${Math.round(share * 100)}%`;

export const aff = (n: number) => n.toFixed(2);

export function ms(n: number): string {
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)} s`;
}

export function tokens(n: number | null): string {
  if (n === null) return "–";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const dShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const dayMonth = (iso: string) => dShort.format(new Date(iso));

export function flightRange(start: string, weeks: number): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(s.getTime() + (weeks * 7 - 1) * 86400000);
  return `${dShort.format(s)} – ${dShort.format(e)}`;
}

const kindLabel: Record<string, string> = {
  bulletin: "Bulletin",
  poster: "Poster",
  digital_bulletin: "Digital bulletin",
  bus_shelter: "Bus shelter",
  kiosk: "Kiosk",
};
export const kindName = (k: string) => kindLabel[k] ?? k;

export function rankLabel(n: number) {
  return String(n).padStart(2, "0");
}
