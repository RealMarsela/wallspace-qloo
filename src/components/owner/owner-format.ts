import type { Face } from "@/contract";
import type { Ink } from "@/components/ui/Pill";
import { kindName } from "@/components/ui/format";
import type { CardSource } from "./owner-api";

/** Where a card came from, for badges: every card is a live Qloo call or a KV copy of one. */
export const sourceText = (source: CardSource | undefined) => (source?.cached ? "Qloo, cached live call" : "Live Qloo call");

const INKS: Exclude<Ink, "neutral" | "night">[] = ["signal", "poster", "cobalt", "park", "lilac"];

/** Stable street ink for a name, so a brand keeps its chip colour across faces. */
export function inkFor(name: string): Exclude<Ink, "neutral" | "night"> {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return INKS[h % INKS.length];
}

/** Two-letter monogram from a brand name, skipping "the" and any parenthesised suffix. */
export function monogram(name: string): string {
  const words = name.replace(/\(.*?\)/g, "").replace(/&/g, " ").split(/\s+/).filter((w) => w && !/^the$/i.test(w));
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Brand name without a "(sample)" suffix (mock mode only). */
export const cleanBrand = (name: string) => name.replace(/\s*\(sample\)\s*$/i, "");

export const faceSize = (f: Face) => `${f.heightFt}×${f.widthFt} ft`;

/** Short spec line: "Digital bulletin · 14×48 ft · lit · reads right". */
export const faceSpecs = (f: Face) =>
  [kindName(f.kind), faceSize(f), f.lit ? "lit" : "unlit", `${f.readSide}-hand read`, `faces ${f.facing}`].join(" · ");

export const myt = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} MYT`;

export const appCardHref = (id: string) => `/app/owner/faces/${encodeURIComponent(id)}`;
export const publicCardHref = (id: string) => `/faces/${encodeURIComponent(id)}`;
