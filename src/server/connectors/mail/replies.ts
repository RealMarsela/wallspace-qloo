import type { InboundReply, ReplyClass } from "@/contract/connectors-comms";
import { tfOptionsFromEnv, TokenFactory } from "@/server/models";
import type { ConnectorEnv } from "../composio/env";
import type { ProviderCtx } from "../composio/registry";
import type { ThreadRow } from "../composio/store";
import { classifyReply, newTextOf } from "./classify";
import { TOKEN_RE } from "./plan-email";

let tfFactory: ((env: ConnectorEnv) => TokenFactory) | null = null;

// Test hook: swap the Token Factory client used by the classifier.
export function setTokenFactory(fn: ((env: ConnectorEnv) => TokenFactory) | null): void {
  tfFactory = fn;
}

export function planIdFromSubject(subject: string): string | null {
  return TOKEN_RE.exec(subject)?.[1] ?? null;
}

// A reply belongs to a plan by thread id first, then by the [WS:plan] token in the subject. Either way it must be tied to
// something Wallspace sent: a token with no matching sent thread is discarded (privacy promise: nothing else is read or stored).
export function matchReply(
  msg: { threadId: string | null; subject: string },
  threads: Pick<ThreadRow, "planId" | "provider" | "threadId">[],
  provider: string,
): string | null {
  if (msg.threadId) {
    const hit = threads.find((t) => t.provider === provider && t.threadId === msg.threadId);
    if (hit) return hit.planId;
  }
  const byToken = planIdFromSubject(msg.subject);
  if (byToken && threads.some((t) => t.provider === provider && t.planId === byToken)) return byToken;
  return null;
}

// Not our own outgoing message: a "Re:" subject, or sent by the person we mailed.
export function looksLikeReply(msg: { subject: string; from: string; messageId: string }, thread: Pick<ThreadRow, "recipient" | "messageId">): boolean {
  if (thread.messageId && msg.messageId === thread.messageId) return false;
  if (/^\s*(re|aw|sv|antw)\s*:/i.test(msg.subject)) return true;
  const to = (thread.recipient ?? "").toLowerCase();
  return !!to && msg.from.toLowerCase().includes(to);
}

const LABEL: Record<ReplyClass, string> = {
  confirmed: "Confirmed", "counter-offer": "Counter-offer", unavailable: "Unavailable", question: "Question", other: "Reply",
};

// Classifies and records one inbound reply on the plan's event log. Idempotent per provider message id.
export async function ingestReply(ctx: ProviderCtx, reply: InboundReply): Promise<{ inserted: boolean; class: ReplyClass }> {
  const dedupeKey = `reply:${reply.provider}:${reply.messageId}`;
  // Poll-safe: a message already on the log costs no model call.
  if (await ctx.store.hasDedupe(dedupeKey)) return { inserted: false, class: "other" };
  const tf = tfFactory ? tfFactory(ctx.rt.env) : new TokenFactory(tfOptionsFromEnv({ NEBIUS_API_KEY: ctx.rt.env.NEBIUS_API_KEY, TF_MODE: ctx.rt.env.TF_MODE }));
  const c = await classifyReply(tf, reply.text);
  const rate = c.proposedRateUsd != null ? `, $${Math.round(c.proposedRateUsd).toLocaleString("en-US")}` : "";
  const { inserted } = await ctx.store.recordEvent({
    provider: reply.provider, planId: reply.planId, direction: "in", kind: "reply",
    summary: `${LABEL[c.class]}${rate}: ${c.summary}`.slice(0, 240),
    detail: {
      class: c.class, proposedRateUsd: c.proposedRateUsd, from: reply.from, subject: reply.subject,
      excerpt: newTextOf(reply.text).slice(0, 400), threadId: reply.threadId, model: c.model, requestId: c.requestId,
    },
    dedupeKey, at: reply.receivedAt,
  });
  return { inserted, class: c.class };
}
