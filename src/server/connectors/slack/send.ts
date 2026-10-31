import type { SendContext, SendOutcome } from "../composio/registry";
import { postMessage, SlackError, type SlackFetch } from "./api";
import { approvalBlocks, approvalText } from "./blocks";

export function slackSender(fetchImpl?: SlackFetch) {
  return async (ctx: SendContext): Promise<SendOutcome> => {
    const channel = ctx.to || ctx.rt.env.WALLSPACE_SLACK_CHANNEL;
    if (!channel) throw new SlackError("a Slack channel is required (to, or WALLSPACE_SLACK_CHANNEL)", "slack_no_channel");
    if (channel.length > 80) throw new SlackError("channel is too long", "slack_bad_channel");
    const f = fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
    const text = approvalText(ctx.bundle);
    const blocks = approvalBlocks(ctx.bundle, ctx.planUrl);
    if (ctx.note) blocks.splice(1, 0, { type: "section", text: { type: "mrkdwn", text: ctx.note.slice(0, 1500) } });
    const res = await postMessage(f, ctx.rt.env.WALLSPACE_SLACK_BOT_TOKEN, { channel, text, blocks });
    const planId = ctx.bundle.plan.id;
    await ctx.store.saveThread({ planId, provider: "slack", threadId: res.ts, messageId: res.ts, token: res.channel, recipient: res.channel, sentAt: new Date().toISOString() });
    await ctx.store.recordEvent({
      provider: "slack", planId, direction: "out", kind: "sent",
      summary: `Approval card posted to Slack (${channel})`, detail: { channel: res.channel, ts: res.ts },
    });
    return { externalId: res.ts, url: null };
  };
}
