import { ComposioWebhookBody } from "@/contract/connectors-comms";
import { ComposioClient } from "./client";
import { appUrl, type RuntimeContext } from "./env";
import { getTriggerHandler } from "./registry";
import { verifyComposioSignature } from "./signature";
import { getStore } from "./store";
import { DEMO_USER_ID } from "@/contract/connectors-comms";
import "./boot";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// POST /api/connectors/composio/webhook. Verify, dedupe, ack at once, run the provider handler under waitUntil.
export async function handleComposioWebhook(req: Request, rt: RuntimeContext): Promise<Response> {
  const secret = rt.env.WALLSPACE_COMPOSIO_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Composio webhook secret is not configured", code: "webhook_not_configured" }, 503);

  const raw = await req.text();
  const sig = await verifyComposioSignature(
    raw,
    { id: req.headers.get("webhook-id"), timestamp: req.headers.get("webhook-timestamp"), signature: req.headers.get("webhook-signature") },
    secret,
  );
  if (!sig.ok) return json({ error: "invalid signature", code: `signature_${sig.reason}` }, 401);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return json({ error: "body is not JSON", code: "bad_json" }, 400);
  }
  const body = ComposioWebhookBody.safeParse(parsedJson);
  if (!body.success) return json({ error: "unexpected webhook shape", code: "bad_shape" }, 400);

  const store = getStore(rt.env);
  const deliveryId = req.headers.get("webhook-id") ?? body.data.id;
  if (!(await store.markWebhookSeen(deliveryId))) return json({ ok: true, duplicate: true });

  const ctx = {
    rt, store,
    composio: new ComposioClient({ apiKey: rt.env.COMPOSIO_API_KEY }),
    userId: DEMO_USER_ID,
    origin: appUrl(rt.env),
  };

  if (body.data.type === "composio.connected_account.expired") {
    const id = body.data.metadata.connected_account_id ?? null;
    rt.waitUntil(store.recordEvent({ provider: "composio", planId: null, direction: "in", kind: "error", summary: `A connected account expired${id ? ` (${id})` : ""}; reconnect it`, detail: { connectedAccountId: id }, dedupeKey: `composio:${deliveryId}` }));
    return json({ ok: true });
  }

  const slug = body.data.metadata.trigger_slug;
  const handler = slug ? getTriggerHandler(slug) : undefined;
  if (!handler) return json({ ok: true, ignored: slug ?? body.data.type });

  rt.waitUntil(
    handler({ ...ctx, event: body.data }).catch(async (e: unknown) => {
      const message = e instanceof Error ? e.message : "handler failed";
      await store.recordEvent({ provider: slug ?? "composio", planId: null, direction: "in", kind: "error", summary: `Trigger ${slug} failed: ${message}`.slice(0, 240), dedupeKey: `err:${deliveryId}` });
    }),
  );
  return json({ ok: true });
}
