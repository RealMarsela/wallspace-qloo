import { TOOLS } from "@/contract/connectors-comms";
import { requireAccount } from "../composio/accounts";
import type { SendContext, SendOutcome } from "../composio/registry";
import { openOohUrl } from "../records/dates";
import { buildPlanEmail, planToken } from "./plan-email";

const pick = (o: unknown, ...keys: string[]): string | null => {
  if (!o || typeof o !== "object") return null;
  const rec = o as Record<string, unknown>;
  for (const k of keys) if (typeof rec[k] === "string" && rec[k]) return rec[k] as string;
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = pick(v, ...keys);
      if (inner) return inner;
    }
  }
  return null;
};

const NAMES = { gmail: "Gmail", outlook: "Outlook" } as const;

export function mailSender(provider: "gmail" | "outlook") {
  return async (ctx: SendContext): Promise<SendOutcome> => {
    if (!ctx.to) throw new Error("a recipient email is required");
    const acct = await requireAccount(ctx, provider, provider);
    const mail = buildPlanEmail(ctx.bundle, ctx.planUrl, ctx.note, openOohUrl(ctx.origin, ctx.bundle.plan.id));
    const planId = ctx.bundle.plan.id;

    let threadId: string | null = null;
    let messageId: string | null = null;
    if (provider === "gmail") {
      const out = await ctx.composio.executeTool(TOOLS.gmailSend, acct.id, ctx.userId, {
        recipient_email: ctx.to, subject: mail.subject, body: mail.html, is_html: true, user_id: "me",
      });
      threadId = pick(out.data, "threadId", "thread_id");
      messageId = pick(out.data, "id", "message_id", "messageId");
    } else {
      // OUTLOOK_SEND_EMAIL returns 202 without ids; replies are matched by the [WS:plan] subject token.
      await ctx.composio.executeTool(TOOLS.outlookSend, acct.id, ctx.userId, {
        to: ctx.to, subject: mail.subject, body: mail.html, is_html: true, save_to_sent_items: true,
      });
    }

    const sentAt = new Date().toISOString();
    await ctx.store.saveThread({ planId, provider, threadId, messageId, token: planToken(planId), recipient: ctx.to, sentAt });
    await ctx.store.recordEvent({
      provider, planId, direction: "out", kind: "sent",
      summary: `Plan sent to ${ctx.to} through ${NAMES[provider]}`,
      detail: { to: ctx.to, subject: mail.subject, threadId },
    });
    return { externalId: threadId ?? messageId, url: null };
  };
}
