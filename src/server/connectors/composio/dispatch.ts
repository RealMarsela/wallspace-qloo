import { SendPlanRequest, SendPlanResponse } from "@/contract";
import { MailSendRequest } from "@/contract/connectors-comms";
import type { z } from "zod";
import { HttpError } from "./http";
import { loadPlanBundle } from "./plans";
import { getSender, senderProviders, type ProviderCtx } from "./registry";
import "./boot";

// POST /api/plans/:id/send. The dispatcher validates the common shape and the mail recipient; each provider's
// sender (B4 registers its own in boot.ts) validates anything else it needs.
export async function dispatchSend(ctx: ProviderCtx, planId: string, body: unknown): Promise<z.infer<typeof SendPlanResponse>> {
  const req = SendPlanRequest.parse(body);
  const sender = getSender(req.provider);
  if (!sender) throw new HttpError(`unknown provider ${req.provider}; available: ${senderProviders().join(", ")}`, "unknown_provider", 400);
  if (req.provider === "gmail" || req.provider === "outlook") {
    const mail = MailSendRequest.safeParse(req);
    if (!mail.success) throw new HttpError("a valid recipient email is required in `to`", "bad_recipient", 400);
  }
  const bundle = await loadPlanBundle(planId, ctx.origin);
  if (!bundle) throw new HttpError(`plan ${planId} was not found`, "plan_not_found", 404);
  const out = await sender({ ...ctx, bundle, to: req.to ?? null, note: req.note ?? null, planUrl: `${ctx.origin}/app/plans/${planId}` });
  return { ok: true, provider: req.provider, externalId: out.externalId, url: out.url };
}
