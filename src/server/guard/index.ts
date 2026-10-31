import { z } from "zod";
import type { GuardVerdict, RunStep } from "@/contract";
import { chatJson, TfError, type TokenFactory } from "../models";
import { detect, type Hit } from "./detect";
import { policy } from "./policy";
import { reasonFor, tasteSuggestion } from "./suggest";

export type GuardKind = "brief" | "copy";

export interface GuardOptions {
  kind?: GuardKind;
  loves?: string[];
  tf?: TokenFactory | null; // only used when the text is ambiguous
  timeoutMs?: number;
}

export interface GuardResult {
  verdict: GuardVerdict;
  path: "deterministic" | "model";
  ms: number;
  steps: RunStep[]; // model calls made, if any
}

const ModelVerdict = z.object({ verdict: z.enum(["pass", "blocked"]), reason: z.string(), suggestion: z.string().nullable() });

const verdict = (status: GuardVerdict["status"], reasons: string[], suggestion: string | null): GuardVerdict => ({ status, engine: "live-guard", reasons, suggestion });

async function askModel(tf: TokenFactory, text: string, hits: Hit[], kind: GuardKind, timeoutMs: number): Promise<{ v: GuardVerdict; steps: RunStep[] } | null> {
  const terms = hits.map((h) => `"${h.term}" (${h.label})`).join(", ");
  const call = chatJson(tf, {
    role: "lightning",
    reasoning: "off",
    maxTokens: 220,
    temperature: 0,
    meta: { title: "taste-only check on an ambiguous phrase", tool: "live-guard", summary: `terms: ${terms}` },
    messages: [
      { role: "system", content: `${policy.policyText}\nYou apply this policy to one ${kind === "brief" ? "campaign brief sentence" : "billboard line"}. Reply as JSON {"verdict":"pass"|"blocked","reason":string,"suggestion":string|null}. Block only when the text selects or describes people by a protected trait; a word that names a taste, place, food, genre or event passes. suggestion is the taste version when blocked, else null.` },
      { role: "user", content: `Text: ${text}\nWords that triggered the check: ${terms}` },
    ],
  }, ModelVerdict);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
  const res = await Promise.race([call.catch(() => null), timeout]);
  if (!res) return null;
  const m = res.value;
  return { v: verdict(m.verdict === "pass" ? "pass" : "blocked", m.verdict === "pass" ? [] : [m.reason], m.verdict === "pass" ? null : m.suggestion), steps: res.steps };
}

export async function guardText(text: string, opts: GuardOptions = {}): Promise<GuardResult> {
  const t0 = Date.now();
  const kind = opts.kind ?? "brief";
  const d = detect(text, { claims: kind === "copy" });
  const done = (v: GuardVerdict, path: GuardResult["path"], steps: RunStep[] = []): GuardResult => ({ verdict: v, path, ms: Date.now() - t0, steps });

  const clear = d.identity.filter((h) => h.clear);
  const reasons = [...clear.map(reasonFor), ...d.claims.map((c) => `Makes a ${c.kind} claim ("${c.term}"). Copy never claims health or financial results.`)];
  if (reasons.length) return done(verdict("blocked", reasons, kind === "brief" ? tasteSuggestion(text, opts.loves) : null), "deterministic");

  const ambiguous = d.identity.filter((h) => !h.clear);
  if (!ambiguous.length) return done(verdict("pass", [], null), "deterministic");

  if (opts.tf) {
    try {
      const m = await askModel(opts.tf, text, ambiguous, kind, opts.timeoutMs ?? 2500);
      if (m) {
        if (m.v.status === "blocked" && kind === "brief") m.v.suggestion = m.v.suggestion || tasteSuggestion(text, opts.loves);
        return done(m.v, "model", m.steps);
      }
    } catch (e) {
      if (!(e instanceof TfError)) throw e;
    }
  }
  // Fail closed: an unverifiable identity word is refused with a plain reason.
  return done(verdict("blocked", [`Could not confirm "${ambiguous[0].term}" is a taste and not ${ambiguous[0].label}. Describe what people love instead.`], kind === "brief" ? tasteSuggestion(text, opts.loves) : null), "deterministic");
}

// The run-panel step for a guard check.
export function guardStep(id: string, title: string, r: GuardResult, tool = "live-guard"): RunStep {
  return {
    id, at: new Date().toISOString(), role: "live-guard", model: null, title, tool,
    summary: r.verdict.status === "pass" ? "passes the taste-only check" : r.verdict.reasons[0] ?? r.verdict.status,
    ms: r.ms, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false,
    status: "ok",
  };
}
