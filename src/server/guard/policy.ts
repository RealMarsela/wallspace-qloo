import raw from "../../../jobs/nemo/policy/policy.json";

// The one policy file, shared with the NeMo Guardrails job (jobs/nemo/policy/policy.json).
export interface PolicyGroup {
  id: string;
  label: string;
  colour?: string[];
  adj: string[];
  plural: string[];
  phrases: string[];
}

export interface Policy {
  name: string;
  version: string;
  policyText: string;
  groups: PolicyGroup[];
  personNouns: string[];
  tasteNouns: string[];
  allow: string[];
  age: { bandPattern: string };
  targetVerbs: string[];
  claims: { health: string[]; financial: string[] };
  tasteExamples: { refused: string; suggestion: string }[];
}

export const policy = raw as Policy;

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Words become a single alternation, longest first so "african american" wins over "african".
export function wordsRe(words: string[], flags = "g"): RegExp | null {
  if (!words.length) return null;
  const alt = [...words].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
  return new RegExp(`(?<![a-z0-9])(?:${alt})(?![a-z0-9])`, flags);
}
