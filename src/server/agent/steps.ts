import type { Run, RunStep } from "@/contract";
import type { StepSink } from "./ports";

export class PlanError extends Error {
  constructor(message: string, readonly code: string, readonly retryable = false) {
    super(message);
    this.name = "PlanError";
  }
}

// Runs one named unit of work. In a Workflow this is step.do (cached on replay, retried on failure); in tests and scripts it is a direct call.
export type StepRunner = <T>(name: string, fn: () => Promise<T>) => Promise<T>;
export const directRunner: StepRunner = (_name, fn) => fn();

// Deterministic ids ("copy:ATL-0007.1"): a retried step overwrites its own rows instead of duplicating them.
export async function emitSteps(sink: StepSink, name: string, steps: RunStep[]): Promise<RunStep[]> {
  const stamped = steps.map((s, i) => ({ ...s, id: `${name}.${i}` }));
  for (const s of stamped) await sink(s);
  return stamped;
}

export function codeStep(role: RunStep["role"], title: string, tool: string, summary: string, ms = 0, status: RunStep["status"] = "ok"): RunStep {
  return { id: "", at: new Date().toISOString(), role, model: null, title, tool, summary, ms, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status };
}

export const sumCost = (steps: RunStep[]) => Math.round(steps.reduce((a, s) => a + (s.costUsd ?? 0), 0) * 1e6) / 1e6;

export function buildRun(id: string, planId: string, kind: Run["kind"], steps: RunStep[], status: Run["status"], startedAt: string): Run {
  return { id, planId, kind, status, steps, costUsd: sumCost(steps), startedAt, endedAt: status === "running" ? null : new Date().toISOString() };
}

export function runHead(r: Run): Omit<Run, "steps"> {
  return { id: r.id, planId: r.planId, kind: r.kind, status: r.status, costUsd: r.costUsd, startedAt: r.startedAt, endedAt: r.endedAt };
}

export async function mapPool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}
