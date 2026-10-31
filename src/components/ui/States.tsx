import type { ReactNode } from "react";
import { Alert } from "./icons";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

/** Error card: poster-red tile, plain message, one recovery action. */
export function ErrorState({ title = "Something went wrong", message, action }: { title?: string; message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 rounded-lg border border-poster/30 bg-surface p-6">
      <span aria-hidden className="grid size-8 place-items-center rounded-md bg-poster text-[#22211d]">
        <Alert size={18} />
      </span>
      <h2 className="text-h4">{title}</h2>
      <p className="text-small text-muted">{message}</p>
      {action}
    </div>
  );
}

/** Empty state: a blank billboard face on its post, a title, one line and one action. */
export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 rounded-lg border border-dashed border-line bg-panel p-6">
      <svg aria-hidden width="72" height="44" viewBox="0 0 72 44" className="text-ink">
        <rect x="2" y="2" width="68" height="28" rx="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2.5" />
        <path d="M9 16h54" stroke="var(--line)" strokeWidth="2.5" strokeDasharray="6 5" />
        <rect x="32" y="31" width="8" height="12" fill="currentColor" />
      </svg>
      <h2 className="text-h4">{title}</h2>
      <p className="text-small text-muted">{message}</p>
      {action}
    </div>
  );
}

/** Centered loading line with three skeleton bars, for whole-panel loads. */
export function LoadingState({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-10 ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
