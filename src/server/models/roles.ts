import type { RunStep } from "@/contract";

// Token Factory model roles. One place holds model ids and list prices (USD per million tokens).
// Super and Nano (removed 9 Nov) are never listed here.

export type TfRole = "superVl" | "lightning" | "ultra" | "embed";

export interface ModelSpec {
  id: string;
  stepRole: RunStep["role"];
  inPerM: number;
  cachedInPerM: number;
  outPerM: number;
  label: string;
}

export const MODELS: Record<TfRole, ModelSpec> = {
  superVl: { id: "nvidia/Nemotron-3.5-Super-VL", stepRole: "super-vl", inPerM: 0.3, cachedInPerM: 0.06, outPerM: 0.9, label: "Nemotron 3.5 Super VL" },
  lightning: { id: "nvidia/Nemotron-3_5-Lightning", stepRole: "lightning", inPerM: 0.06, cachedInPerM: 0.03, outPerM: 0.24, label: "Nemotron 3.5 Lightning" },
  ultra: { id: "nvidia/Nemotron-3-Ultra-550b-a55b", stepRole: "ultra", inPerM: 1, cachedInPerM: 0.12, outPerM: 3, label: "Nemotron 3 Ultra" },
  embed: { id: "Qwen/Qwen3-Embedding-8B", stepRole: "embedding", inPerM: 0.01, cachedInPerM: 0.01, outPerM: 0, label: "Qwen3 Embedding 8B (not an NVIDIA model)" },
};

export function costUsd(role: TfRole, promptTokens: number, cachedTokens: number, completionTokens: number): number {
  const m = MODELS[role];
  const fresh = Math.max(0, promptTokens - cachedTokens);
  const usd = (fresh * m.inPerM + cachedTokens * m.cachedInPerM + completionTokens * m.outPerM) / 1_000_000;
  return Math.round(usd * 1e8) / 1e8;
}

// Reasoning switches measured on Token Factory (30 Oct): "none" sends both; Lightning leaks thinking into content otherwise.
export type Reasoning = "off" | "default";

export function reasoningFields(reasoning: Reasoning): Record<string, unknown> {
  return reasoning === "off" ? { reasoning_effort: "none", chat_template_kwargs: { enable_thinking: false } } : {};
}
