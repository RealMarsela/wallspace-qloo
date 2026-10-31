"use client";
import { BriefsResponse } from "@/contract";
import { Listbox, type ListOption } from "@/components/ui/Listbox";
import { useAsync } from "@/components/ui/useAsync";
import { brandTitle } from "@/components/plan/plan-derive";
import { api } from "@/lib/api-client";
import { PLAN_STATUS_LABEL } from "@/lib/status-labels";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function loadOptions(): Promise<ListOption[]> {
  const { plans } = await api.plans();
  const names = new Map<string, string>();
  try {
    const res = await fetch("/api/briefs", { headers: { accept: "application/json" } });
    const parsed = BriefsResponse.safeParse(await res.json());
    if (res.ok && parsed.success) parsed.data.briefs.forEach((b) => names.set(b.id, brandTitle(b.brandName)));
  } catch {
    // signed out or mock mode: plans are named by date
  }
  return plans
    .filter((p) => p.status !== "failed")
    .map((p) => ({
      value: p.id,
      label: p.sample ? "Sample plan · Porchlight Comedy Tour" : (names.get(p.briefId) ?? "Plan"),
      hint: p.sample ? "Read-only, pre-computed" : `${when.format(new Date(p.createdAt))} · ${PLAN_STATUS_LABEL[p.status]}`,
      group: p.sample ? "Sample" : "Your plans",
    }));
}

/** Which plan to compare blocks in. Hidden when there is only one plan to choose. */
export function PlanPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const state = useAsync(loadOptions, "compare-plans");
  if (state.status !== "ready" || state.data.length < 2) return null;
  return (
    <div className="w-full sm:w-[300px]">
      <Listbox value={value} onChange={onChange} options={state.data} label="Plan" testId="compare-plan" />
    </div>
  );
}
