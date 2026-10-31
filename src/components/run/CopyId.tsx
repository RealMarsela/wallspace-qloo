"use client";
import { useState } from "react";
import { Check } from "@/components/ui/icons";
import { Copy } from "@/components/ui/icons-app";

/** A provider request id in mono with a copy button (for the Nebius feedback field). Shows "Copied" for 1.5 s. */
export function CopyId({ value, testId }: { value: string | null; testId?: string }) {
  const [done, setDone] = useState(false);
  if (!value) return <span data-testid={testId} className="font-mono text-micro text-muted">–</span>;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value ?? "");
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      setDone(false);
    }
  }
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      <span data-testid={testId} title={value} className="min-w-0 truncate font-mono text-micro text-ink-2">
        {value}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={done ? "Request id copied" : `Copy request id ${value}`}
        className="grid size-6 shrink-0 place-items-center rounded-xs text-muted transition-colors hover:bg-panel hover:text-ink"
      >
        {done ? <Check size={14} className="text-park-deep" /> : <Copy size={14} />}
      </button>
      <span role="status" className="sr-only">
        {done ? "Copied" : ""}
      </span>
    </span>
  );
}
