"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { CompareView, type CompareSelection } from "./CompareView";

/** Reads ?plan=&a=&b= and writes the selection back (history replace, no scroll) so a comparison can be shared as a link. */
export function CompareFromQuery() {
  const q = useSearchParams();
  const path = usePathname() ?? "/app/compare";
  const sel: CompareSelection = { planId: q.get("plan") ?? undefined, a: q.get("a") ?? undefined, b: q.get("b") ?? undefined };
  const onSelect = (next: CompareSelection) => {
    const p = new URLSearchParams();
    if (next.planId) p.set("plan", next.planId);
    if (next.a) p.set("a", next.a);
    if (next.b) p.set("b", next.b);
    // Native history: Next syncs it into useSearchParams without a server round trip or a scroll jump.
    window.history.replaceState(null, "", `${path}?${p.toString()}`);
  };
  return <CompareView sel={sel} onSelect={onSelect} />;
}
