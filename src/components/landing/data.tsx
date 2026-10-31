"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type PlanData, type RunData } from "@/lib/api-client";
import { SAMPLE_PLAN_ID } from "@/lib/routes";
import { fetchLimits, type Limits } from "@/app/limits/limits-data";

type Load<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };

export interface SampleState {
  plan: Load<PlanData>;
  run: Load<RunData["run"]>;
  limits: Load<Limits>;
  mock: boolean;
}

const Ctx = createContext<SampleState>({ plan: { status: "loading" }, run: { status: "loading" }, limits: { status: "loading" }, mock: true });

const fail = (e: unknown) => ({ status: "error" as const, message: e instanceof Error ? e.message : "Could not load." });

async function loadPlan(): Promise<PlanData> {
  try {
    return await api.plan(SAMPLE_PLAN_ID);
  } catch {
    return api.plan(await api.samplePlanId());
  }
}

/** Loads the public sample plan, its run and the measured limits once for the whole landing page. Sections read them
 *  with useSample(); each shows a sized skeleton while loading and a plain fallback if a read fails. */
export function SampleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SampleState>({ plan: { status: "loading" }, run: { status: "loading" }, limits: { status: "loading" }, mock: api.mode === "mock" });
  useEffect(() => {
    let live = true;
    const set = (patch: Partial<SampleState>) => live && setState((s) => ({ ...s, ...patch }));
    loadPlan().then(
      (plan) => {
        set({ plan: { status: "ready", data: plan } });
        api.run(plan.plan.runId).then(
          (r) => set({ run: { status: "ready", data: r.run } }),
          (e) => set({ run: fail(e) }),
        );
      },
      (e) => set({ plan: fail(e), run: fail(e) }),
    );
    fetchLimits().then(
      (l) => set({ limits: { status: "ready", data: l } }),
      (e) => set({ limits: fail(e) }),
    );
    return () => {
      live = false;
    };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useSample = () => useContext(Ctx);
