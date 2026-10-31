import { z } from "zod";
import type { RunStep } from "@/contract";
import type { TokenFactory } from "./client";
import { TfError, type ChatOptions } from "./types";

// Pulls the last balanced JSON object or array out of text that may carry thinking or code fences.
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const candidates: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const open = cleaned[i];
    if (open !== "{" && open !== "[") continue;
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    for (let j = i; j < cleaned.length; j++) {
      const c = cleaned[j];
      if (inStr) {
        if (c === "\\") j++;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close && --depth === 0) {
        candidates.push(cleaned.slice(i, j + 1));
        i = j;
        break;
      }
    }
  }
  for (const c of candidates.reverse()) {
    try {
      return JSON.parse(c);
    } catch {
      // try the next candidate
    }
  }
  throw new TfError("no JSON in model output", "bad_json");
}

function stripMeta(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema: _drop, ...rest } = schema;
  void _drop;
  return rest;
}

export interface JsonResult<T> {
  value: T;
  steps: RunStep[]; // one per attempt, so a retry shows on the run panel
}

// Chat that must return JSON matching a zod schema. Validates, retries once with the error appended, then throws.
// `retry` overrides options on the second attempt (e.g. thinking off after a reasoning run that never reached the JSON).
export async function chatJson<T>(tf: TokenFactory, o: ChatOptions, schema: z.ZodType<T>, retry?: Partial<ChatOptions>): Promise<JsonResult<T>> {
  const jsonSchema = o.jsonSchema ?? { name: "result", schema: stripMeta(z.toJSONSchema(schema) as Record<string, unknown>) };
  const steps: RunStep[] = [];
  let messages = o.messages;
  let lastError = "invalid JSON";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await tf.chat({ ...o, ...(attempt === 1 ? retry : {}), messages, jsonSchema: attempt === 0 ? jsonSchema : undefined });
    steps.push(res.step);
    try {
      const parsed = schema.safeParse(extractJson(res.content));
      if (parsed.success) return { value: parsed.data, steps };
      lastError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "invalid JSON";
    }
    steps[steps.length - 1] = { ...res.step, status: "error", summary: `${res.step.summary} (invalid output, retried: ${lastError})`.trim() };
    messages = [...o.messages, { role: "assistant", content: res.content.slice(0, 1500) }, { role: "user", content: `That was not valid. Fix: ${lastError}. Reply with only the JSON.` }];
  }
  const err = new TfError(`model output failed validation twice: ${lastError}`, "bad_json");
  (err as TfError & { steps?: RunStep[] }).steps = steps;
  throw err;
}
