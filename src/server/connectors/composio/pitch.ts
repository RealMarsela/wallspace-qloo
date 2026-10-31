import { SendPitchRequest, SendPitchResponse, type Face, type MediaOwner } from "@/contract";
import { MailSendRequest, TOOLS } from "@/contract/connectors-comms";
import { faceById, owners } from "@/data/faces";
import type { z } from "zod";
import { buildPitch, pitchPlanId } from "../mail/pitch-email";
import { postMessage, SlackError } from "../slack/api";
import { pitchBlocks, pitchText } from "../slack/pitch-blocks";
import { requireAccount } from "./accounts";
import { HttpError } from "./http";
import { loadAudienceCard, type AudienceCardBundle } from "./pitch-source";
import type { ProviderCtx } from "./registry";

// POST /api/owner/faces/:id/pitch. A media owner sends a pitch sheet for one face to a brand contact (Gmail or Outlook)
// or shares it internally in Slack. Replies come back through the normal mail sync under plan id `pitch-<faceId>`;
// only messages tied to a thread or token Wallspace sent are ever read.

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

export async function dispatchPitch(ctx: ProviderCtx, faceId: string, body: unknown): Promise<z.infer<typeof SendPitchResponse>> {
  const req = SendPitchRequest.parse(body);
  if (req.provider !== "gmail" && req.provider !== "outlook" && req.provider !== "slack") {
    throw new HttpError(`pitches go out by gmail, outlook or slack, not ${req.provider}`, "unknown_provider", 400);
  }
  if (req.provider !== "slack" && !MailSendRequest.safeParse(req).success) throw new HttpError("a valid recipient email is required in `to`", "bad_recipient", 400);
  const face: Face | undefined = faceById(faceId);
  if (!face) throw new HttpError(`face ${faceId} was not found`, "face_not_found", 404);
  const owner: MediaOwner | null = owners.find((o) => o.id === face.ownerId) ?? null;
  const loaded: AudienceCardBundle | null = await loadAudienceCard(faceId, ctx.origin);
  if (!loaded) throw new HttpError("the audience card could not be produced for this face", "card_unavailable", 503);

  const faceUrl = `${ctx.origin}/faces/${encodeURIComponent(faceId)}`;
  const planId = pitchPlanId(faceId);
  const sentAt = new Date().toISOString();

  if (req.provider === "slack") {
    const channel = req.to || ctx.rt.env.WALLSPACE_SLACK_CHANNEL;
    if (!channel) throw new SlackError("a Slack channel is required (to, or WALLSPACE_SLACK_CHANNEL)", "slack_no_channel");
    const res = await postMessage((...a) => fetch(...a), ctx.rt.env.WALLSPACE_SLACK_BOT_TOKEN, {
      channel, text: pitchText(face), blocks: pitchBlocks(face, owner, loaded.card, faceUrl, req.note),
    });
    await ctx.store.recordEvent({ provider: "slack", planId, direction: "out", kind: "sent", summary: `Pitch for ${face.id} shared in Slack (${channel})`, detail: { channel: res.channel, ts: res.ts, faceId } });
    return { ok: true, provider: "slack", externalId: res.ts, url: null };
  }

  const provider = req.provider;
  const acct = await requireAccount(ctx, provider, provider);
  const mail = buildPitch(face, owner, loaded.card, faceUrl, req.note);
  let threadId: string | null = null;
  let messageId: string | null = null;
  if (provider === "gmail") {
    const out = await ctx.composio.executeTool(TOOLS.gmailSend, acct.id, ctx.userId, { recipient_email: req.to, subject: mail.subject, body: mail.html, is_html: true, user_id: "me" });
    threadId = pick(out.data, "threadId", "thread_id");
    messageId = pick(out.data, "id", "message_id", "messageId");
  } else {
    await ctx.composio.executeTool(TOOLS.outlookSend, acct.id, ctx.userId, { to: req.to, subject: mail.subject, body: mail.html, is_html: true, save_to_sent_items: true });
  }
  await ctx.store.saveThread({ planId, provider, threadId, messageId, token: `[WS:${planId}]`, recipient: req.to ?? null, sentAt });
  await ctx.store.recordEvent({
    provider, planId, direction: "out", kind: "sent",
    summary: `Pitch for ${face.id} sent to ${req.to} through ${provider === "gmail" ? "Gmail" : "Outlook"}`,
    detail: { to: req.to, subject: mail.subject, threadId, faceId },
  });
  return { ok: true, provider, externalId: threadId ?? messageId, url: faceUrl };
}
