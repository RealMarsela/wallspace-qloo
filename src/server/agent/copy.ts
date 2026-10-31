import { z } from "zod";
import type { Brief, CopyLine, Face, RunStep } from "@/contract";
import { guardText } from "../guard";
import { policy } from "../guard/policy";
import { chatJson, isModelUnavailable, MODELS, type TokenFactory } from "../models";
import { describeRejected, MAX_WORDS, sortLines, type Rejected } from "./copy-check";

// Lightning writes three lines per face. Static rules come first so the prefix caches across faces; per-face data comes last.
const RULES = `You write outdoor advertising lines for a billboard read from a moving car.
Hard rules: at most 7 words per line (count them; 4 to 6 words is ideal, e.g. "West End knows the punchline." is 5, "Little Five laughs louder. Nov 21." is 6); every line is a complete phrase that reads finished on its own, never ending on an article, preposition or conjunction (not "Catch the." or "Laughs at the"), and a line is never cut to fit, so write it short instead; plain words, no hashtags, no emoji; each line sounds local to the block (use its tastes or its name, never a stereotype);
describe taste, never people by race, religion, sexuality, gender identity, disability, health, age, nationality or immigration status; no health claims; no financial claims.
Policy: ${policy.policyText}
Reply as JSON {"lines":[{"text":string,"rationale":string}]} with exactly three lines of different angles. rationale is one short sentence naming the tag or fact the line leans on.`;

export { wordCount } from "./copy-check";

const Drafts = z.object({ lines: z.array(z.object({ text: z.string().min(1), rationale: z.string() })).min(1).max(6) });
type Draft = z.infer<typeof Drafts>["lines"][number];

export interface CopyInput {
  brief: Pick<Brief, "brandName" | "brandVoice" | "audienceText" | "loves" | "flightStart" | "flightWeeks">;
  face: Pick<Face, "id" | "name" | "neighbourhood" | "kind">;
  topTags: string[];
  events: { title: string; date: string }[];
  redraftNote?: string; // set when Ultra flagged this face
  avoid?: string[]; // lines already used on nearby faces
}

export interface CopyResult {
  lines: CopyLine[]; // only lines that passed the complete-phrase check; fewer than 2 means needsHuman
  steps: RunStep[]; // every model attempt, rejected ones included
  needsHuman: string | null; // set when the face ended with fewer than 2 valid lines; shown as the review note
}

export const MIN_LINES = 2;
const WANT = 3;

interface Attempt { drafts: Draft[]; steps: RunStep[]; jsonFailed: boolean; unavailable: string | null }

async function ask(tf: TokenFactory, facts: string, title: string, summary: string): Promise<Attempt> {
  try {
    const r = await chatJson(tf, {
      role: "lightning", reasoning: "off", temperature: 0.8, maxTokens: 400,
      meta: { title, tool: "copy", summary },
      messages: [{ role: "system", content: RULES }, { role: "user", content: facts }],
    }, Drafts);
    return { drafts: r.value.lines, steps: r.steps, jsonFailed: false, unavailable: null };
  } catch (e) {
    if (isModelUnavailable(e)) {
      // Copy is required, so this is an error step (not a skip): the face is handed to a human, and no other model is tried.
      const m = MODELS.lightning;
      const code = `${e.code}${e.status ? `, HTTP ${e.status}` : ""}`;
      const step: RunStep = { id: "", at: new Date().toISOString(), role: m.stepRole, model: m.id, title, tool: "copy", summary: `${m.label} returned ${code}; no lines written, this face needs a human`, ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "error", errorCode: e.code };
      return { drafts: [], steps: [step], jsonFailed: false, unavailable: code };
    }
    const steps = (e as { steps?: RunStep[] }).steps;
    if (!steps) throw e; // a transport failure is not a copy failure
    return { drafts: [], steps, jsonFailed: true, unavailable: null };
  }
}

// The run trace stays honest: the attempt's last step says how many of its lines the validator rejected.
function annotate(a: Attempt, rejected: Rejected[]): RunStep[] {
  if (!rejected.length || !a.steps.length) return a.steps;
  const last = a.steps[a.steps.length - 1];
  return [...a.steps.slice(0, -1), { ...last, status: "error", summary: `${last.summary} (rejected ${rejected.length} of ${a.drafts.length}: ${describeRejected(rejected)})`.trim() }];
}

// Policy: a line is complete or it is not used. Attempt 1 writes three; rejected ones are re-asked once with the failure stated; if fewer
// than MIN_LINES are valid, one redraft of the whole face; if still short the face is marked "copy needs a human" and no fragment ships.
export async function writeCopy(tf: TokenFactory, i: CopyInput): Promise<CopyResult> {
  const facts = [
    `Brand: ${i.brief.brandName}. Voice: ${i.brief.brandVoice ?? "warm, dry, a little cheeky"}. Audience loves: ${i.brief.loves.join("; ")}.`,
    `Flight: ${i.brief.flightStart}, ${i.brief.flightWeeks} weeks.`,
    `Face ${i.face.id}: ${i.face.kind} at ${i.face.name}, ${i.face.neighbourhood}.`,
    `This block over-indexes on: ${i.topTags.join(", ") || "no tag evidence"}.`,
    i.events.length ? `During the flight nearby: ${i.events.map((e) => `${e.title} (${e.date})`).join("; ")}.` : "No dated event nearby.",
    i.avoid?.length ? `Do not reuse or echo these lines used on nearby faces: ${i.avoid.join(" | ")}.` : "",
    i.redraftNote ? `Redraft: a reviewer flagged the last lines: ${i.redraftNote}` : "",
  ].filter(Boolean).join("\n");

  const steps: RunStep[] = [];
  const valid: Draft[] = [];
  let lastRejected: Rejected[] = [];
  const failures: string[] = [];
  const st = { gone: null as string | null }; // set when the copy model is unavailable

  // One attempt: ask, sort the answer, keep the valid lines, trace the rejected ones.
  const attempt = async (title: string, extra: string) => {
    const a = await ask(tf, extra ? `${facts}\n${extra}` : facts, title, i.face.neighbourhood);
    const sorted = sortLines(a.drafts, valid.map((d) => d.text));
    const rejected: Rejected[] = sorted.rejected.map(({ text, reason }) => ({ text, reason }));
    if (a.jsonFailed) rejected.push({ text: "(no usable output)", reason: "not valid JSON twice" });
    valid.push(...sorted.valid.slice(0, Math.max(0, WANT - valid.length)));
    steps.push(...annotate(a, rejected));
    st.gone = a.unavailable ?? st.gone;
    if (rejected.length) { lastRejected = rejected; failures.push(...rejected.map((r) => `"${r.text}" (${r.reason})`)); }
  };
  const stated = () => `Your previous answer had lines that were rejected: ${failures.slice(-4).join("; ")}. A line must be a complete phrase of at most ${MAX_WORDS} words that does not end on an article, preposition or conjunction. Never cut a line to fit.`;

  await attempt(`${i.redraftNote ? "redraft" : "write"} 3 lines for ${i.face.id}`, "");
  if (!st.gone && valid.length < WANT) {
    const need = WANT - valid.length;
    await attempt(`retry ${need} line${need > 1 ? "s" : ""} for ${i.face.id} (rejected lines stated)`, `${stated()} Keep these accepted lines and write ${need} different-angle replacement${need > 1 ? "s" : ""}, exactly ${need} line${need > 1 ? "s" : ""}: ${valid.map((d) => `"${d.text}"`).join(" | ") || "none yet"}.`);
  }
  if (!st.gone && valid.length < MIN_LINES) {
    await attempt(`redraft 3 lines for ${i.face.id} (fewer than ${MIN_LINES} valid)`, `${stated()} Write ${WANT} new lines from scratch, each a finished phrase of 3 to 6 words.${valid.length ? ` Already accepted: ${valid.map((d) => `"${d.text}"`).join(" | ")}.` : ""}`);
  }

  const needsHuman = valid.length < MIN_LINES
    ? st.gone ? `Copy needs a human: the copy model was unavailable (${st.gone}); ${valid.length} of ${WANT} lines written.` : `Copy needs a human: ${valid.length} of ${WANT} lines passed the complete-phrase check after a retry and a redraft${lastRejected.length ? `; last rejected ${describeRejected(lastRejected.slice(0, 3))}` : ""}.`
    : null;

  const lines: CopyLine[] = [];
  for (const l of valid.slice(0, WANT)) {
    const g = await guardText(l.text, { kind: "copy" });
    lines.push({ text: l.text.trim(), rationale: l.rationale, guard: g.verdict, nemo: null });
  }
  return { lines, steps, needsHuman };
}
