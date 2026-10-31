import { TRIGGERS, type InboundReply } from "@/contract/connectors-comms";
import { registerProvider, registerSender, registerTriggerHandler, type TriggerContext } from "../composio/registry";
import { normalizeGmail, normalizeOutlook } from "./normalize";
import { ingestReply, looksLikeReply, matchReply } from "./replies";
import { mailSender } from "./send";

registerProvider({ id: "gmail", name: "Gmail", category: "mail", realtime: "trigger", toolkit: "gmail" });
registerProvider({ id: "outlook", name: "Outlook", category: "mail", realtime: "webhook", toolkit: "outlook" });
registerSender("gmail", mailSender("gmail"));
registerSender("outlook", mailSender("outlook"));

// Webhook path. Needs a Wallspace-owned Composio webhook subscription; until then replies arrive through mail sync.
async function fromTrigger(ctx: TriggerContext, provider: "gmail" | "outlook"): Promise<void> {
  const msg = provider === "gmail" ? normalizeGmail(ctx.event.data) : normalizeOutlook(ctx.event.data);
  if (!msg) return;
  const planId = matchReply(msg, await openThreadsOf(ctx, provider), provider);
  if (!planId) return;
  const thread = (await ctx.store.threadsForPlan(planId, provider))[0];
  if (!thread || !looksLikeReply(msg, thread)) return; // not tied to something we sent: discard
  const reply: InboundReply = { provider, planId, ...msg };
  await ingestReply(ctx, reply);
}

async function openThreadsOf(ctx: TriggerContext, provider: string) {
  return ctx.store.openThreads(provider, new Date(Date.now() - 14 * 86400_000).toISOString());
}

registerTriggerHandler(TRIGGERS.gmailNew, (ctx) => fromTrigger(ctx, "gmail"));
registerTriggerHandler(TRIGGERS.outlookMessage, (ctx) => fromTrigger(ctx, "outlook"));
