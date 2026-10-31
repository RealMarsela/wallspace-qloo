import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/States";

/** Inset product card inside a feature's coloured media panel: a title row (what this view is, which model made it)
 *  over a surface body. Positioned to bleed off the panel's bottom-right like a cropped screenshot. */
export function MediaFrame({ title, meta, children, className = "" }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`absolute inset-x-4 bottom-0 top-6 flex flex-col overflow-hidden rounded-t-lg border border-[#22211d]/10 bg-surface text-ink shadow-lg sm:inset-x-8 sm:top-10 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="truncate text-small">{title}</span>
        {meta ? <span className="shrink-0 font-mono text-[0.68rem] text-muted">{meta}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function MediaLoading({ failed }: { failed?: boolean }) {
  if (failed) return <p className="p-4 text-small text-muted">The sample plan did not load here. Open it from the link beside this card.</p>;
  return (
    <div className="flex flex-col gap-2.5 p-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

/** "0.0005 USD" style cost from the run log, kept to 2 significant figures. */
export function usdTiny(n: number | null): string {
  if (n === null) return "no cost logged";
  if (n === 0) return "$0";
  return `$${n.toPrecision(2)}`;
}
