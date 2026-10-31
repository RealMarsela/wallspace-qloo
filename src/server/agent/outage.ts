import type { RunStep } from "@/contract";
import { MODELS, type TfError, type TfRole } from "../models";

// When a model, Tavily or Qloo is gone, an optional step is recorded as skipped and the run keeps going. The step names the code, so the
// run panel shows what happened. A different model is never swapped in.

export function skippedStep(role: TfRole, e: TfError, title: string, tool: string, effect: string): RunStep {
  const m = MODELS[role];
  const code = `${e.code}${e.status ? `, HTTP ${e.status}` : ""}`;
  return {
    id: "", at: new Date().toISOString(), role: m.stepRole, model: m.id, title, tool, summary: `skipped (model unavailable): ${m.label} returned ${code}. ${effect}`,
    ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "skipped", errorCode: e.code,
  };
}

export function skippedCodeStep(role: RunStep["role"], title: string, tool: string, summary: string, errorCode: string): RunStep {
  return { id: "", at: new Date().toISOString(), role, model: null, title, tool, summary, ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "skipped", errorCode };
}

export const codeOf = (e: unknown): string => (e as { code?: string } | null)?.code ?? (e instanceof Error ? e.name : "error");
export const statusOf = (e: unknown): string => ((e as { status?: number } | null)?.status ? ` HTTP ${(e as { status: number }).status}` : "");
