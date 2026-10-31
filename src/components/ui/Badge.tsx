import type { ReactNode } from "react";

export type Status = "ok" | "warn" | "guard" | "info" | "neutral" | "running";

const s: Record<Status, string> = {
  ok: "bg-park-soft text-park-deep",
  warn: "bg-signal-soft text-signal-deep",
  guard: "bg-poster-soft text-poster-deep",
  info: "bg-cobalt-soft text-cobalt-deep",
  neutral: "bg-panel text-ink-2",
  running: "bg-cobalt-soft text-cobalt-deep",
};

/** Status pill with a leading dot: plan status, connection state, guard result. "running" pulses. */
export function Badge({ status = "neutral", children, className = "", testId }: { status?: Status; children: ReactNode; className?: string; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-micro ${s[status]} ${className}`}>
      <i aria-hidden className={`size-1.5 rounded-full bg-current ${status === "running" ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
