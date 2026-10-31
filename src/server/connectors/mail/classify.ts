import { z } from "zod";
import { ReplyClassification } from "@/contract/connectors-comms";
import { chatJson } from "@/server/models/json";
import type { TokenFactory } from "@/server/models/client";

// Reply classifier on Nemotron 3.5 Lightning (thinking off) through B2's Token Factory adapter.

const SYSTEM = `You read a reply from a media owner or advertiser about an outdoor (billboard) advertising plan and label it.
Return only JSON: {"class": one of "confirmed" | "counter-offer" | "unavailable" | "question" | "other", "summary": one short sentence (max 140 characters) in plain words, "proposedRateUsd": number or null}.
confirmed = agrees to the plan or the faces as proposed. counter-offer = proposes a different rate or price (set proposedRateUsd when a monthly dollar figure is stated, else null). unavailable = says a face or the flight dates cannot be booked. question = asks for information. other = anything else (out-of-office, thanks, unrelated).`;

// Only the new text of the reply: drops quoted history and signatures that would confuse the label.
export function newTextOf(body: string): string {
  const cut = body.split(/\r?\n(?:On .{5,120} wrote:|-{2,}\s*Original Message|From:\s.+\r?\nSent:)/i)[0] ?? body;
  const lines = cut.split(/\r?\n/).filter((l) => !l.trim().startsWith(">"));
  return lines.join("\n").replace(/\s+\n/g, "\n").trim().slice(0, 1800);
}

export interface Classified extends z.infer<typeof ReplyClassification> {
  model: string | null;
  requestId: string | null;
}

export async function classifyReply(tf: TokenFactory, replyText: string): Promise<Classified> {
  const text = newTextOf(replyText);
  if (!text) return { class: "other", summary: "Empty reply", proposedRateUsd: null, model: null, requestId: null };
  try {
    const { value, steps } = await chatJson(
      tf,
      {
        role: "lightning",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `Reply:\n"""\n${text}\n"""` }],
        meta: { title: "classify an inbound plan reply", tool: "mail.reply", summary: text.slice(0, 80) },
        temperature: 0,
        maxTokens: 200,
      },
      ReplyClassification,
    );
    const step = steps[steps.length - 1];
    return { ...value, model: step?.model ?? null, requestId: step?.requestId ?? null };
  } catch {
    return { class: "other", summary: "Reply received (could not be classified)", proposedRateUsd: null, model: null, requestId: null };
  }
}
