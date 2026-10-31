"use client";
import type { ReactNode } from "react";
import { IconChip } from "@/components/ui/IconChip";
import type { Ink } from "@/components/ui/Pill";
import { Billboard, Check, Shield } from "@/components/ui/icons";
import { Clock, Dashboard } from "@/components/ui/icons-app";
import { filterMatch, type PlanFilter } from "@/components/plan/plan-status";
import type { DashRow } from "./dashboard-data";

const tiles: { id: PlanFilter; label: string; ink: Ink; icon: ReactNode; hint: string }[] = [
  { id: "all", label: "All plans", ink: "neutral", icon: <Dashboard />, hint: "Yours plus the public sample" },
  { id: "ready", label: "Ready", ink: "park", icon: <Billboard />, hint: "Faces picked, lines written" },
  { id: "running", label: "Running", ink: "cobalt", icon: <Clock />, hint: "Agent still at work" },
  { id: "signoff", label: "Needs sign-off", ink: "signal", icon: <Check />, hint: "Waiting on you" },
  { id: "nemo", label: "NeMo-checked", ink: "lilac", icon: <Shield />, hint: "Every line passed NeMo" },
];

/** Counts that double as filters: each tile is a toggle button; the chosen one filters the list below. */
export function StatFilters({ rows, value, onChange }: { rows: DashRow[] | null; value: PlanFilter; onChange: (f: PlanFilter) => void }) {
  return (
    <div role="group" aria-label="Filter plans by status" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-testid="dashboard-counts">
      {tiles.map((t) => {
        const n = rows ? rows.filter((r) => filterMatch[t.id](r.status)).length : null;
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            data-testid={`dashboard-count-${t.id}`}
            data-count={n ?? ""}
            onClick={() => onChange(on && t.id !== "all" ? "all" : t.id)}
            className={`group flex flex-col gap-2 rounded-md border p-3 text-left sm:gap-3 sm:p-3.5 transition-[border-color,background-color,box-shadow] duration-200 ${
              on ? "border-ink bg-surface shadow-sm" : "border-line bg-panel hover:border-[color-mix(in_oklab,var(--line),var(--ink)_30%)] hover:bg-surface"
            } ${t.id === "all" ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <span className="hidden items-center justify-between gap-2 sm:flex">
              <IconChip ink={t.ink} size="sm">
                {t.icon}
              </IconChip>
              {on ? <span className="font-mono text-[0.66rem] uppercase tracking-wide text-muted">Filter on</span> : null}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-[1.5rem] sm:text-[1.75rem] leading-none tabular-nums text-ink">{n ?? "–"}</span>
              <span className="text-small text-ink">{t.label}</span>
            </span>
            <span className="hidden text-micro text-muted sm:block">{t.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
