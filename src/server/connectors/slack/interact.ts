import { z } from "zod";
import { SLACK_CHANGES_CALLBACK, SlackButtonValue } from "@/contract/connectors-comms";
import { appUrl, type RuntimeContext } from "../composio/env";
import { loadPlanBundle } from "../composio/plans";
import { getStore, type CommsStore } from "../composio/store";
import { openView, respondUrl, updateMessage, type SlackFetch } from "./api";
import { changesModal, decidedBlocks, type ChangesMeta } from "./blocks";
import { verifySlackSignature } from "./verify";

// POST /api/connectors/slack/interact. Verify, ack with 200 inside 3 s, do the work under waitUntil.

const User = z.object({ id: z.string(), name: z.string().optional(), username: z.string().optional() }).passthrough();
const BlockActions = z.object({
  type: z.literal("block_actions"),
  user: User,
  trigger_id: z.string(),
  response_url: z.string().optional(),
  container: z.object({ channel_id: z.string().optional(), message_ts: z.string().optional() }).passthrough().optional(),
  channel: z.object({ id: z.string() }).passthrough().optional(),
  message: z.object({ ts: z.string() }).passthrough().optional(),
  actions: z.array(z.object({ action_id: z.string(), value: z.string().optional() }).passthrough()).min(1),
}).passthrough();
const ViewSubmission = z.object({
  type: z.literal("view_submission"),
  user: User,
  view: z.object({
    callback_id: z.string(),
    private_metadata: z.string().optional(),
    state: z.object({ values: z.record(z.string(), z.record(z.string(), z.object({ value: z.string().nullish() }).passthrough())) }),
  }).passthrough(),
}).passthrough();

const who = (u: z.infer<typeof User>) => u.name ?? u.username ?? u.id;
const ack = () => new Response(null, { status: 200 });
const bad = (error: string, code: string, status: number) => Response.json({ error, code }, { status });

export interface InteractDeps {
  fetchImpl?: SlackFetch;
  now?: () => Date;
}

async function refreshCard(store: CommsStore, rt: RuntimeContext, f: SlackFetch, planId: string, channel: string, ts: string, outcome: string) {
  const origin = appUrl(rt.env);
  const bundle = await loadPlanBundle(planId, origin);
  const planUrl = `${origin}/app/plans/${planId}`;
  const blocks = bundle
    ? decidedBlocks(bundle, planUrl, outcome)
    : [{ type: "section", text: { type: "mrkdwn", text: `Plan \`${planId}\`: ${outcome}` } }];
  await updateMessage(f, rt.env.WALLSPACE_SLACK_BOT_TOKEN, { channel, ts, text: outcome, blocks });
  void store;
}

async function onApprove(rt: RuntimeContext, f: SlackFetch, p: z.infer<typeof BlockActions>, planId: string) {
  const store = getStore(rt.env);
  const channel = p.container?.channel_id ?? p.channel?.id ?? "";
  const ts = p.container?.message_ts ?? p.message?.ts ?? "";
  const user = who(p.user);
  const { inserted } = await store.recordEvent({
    provider: "slack", planId, direction: "in", kind: "approved",
    summary: `Approved in Slack by @${user}`, detail: { user: p.user.id, channel, ts },
    dedupeKey: `slack:${channel}:${ts}:approved`,
  });
  if (!inserted) return;
  const outcome = `:white_check_mark: Approved by <@${p.user.id}>`;
  if (channel && ts) await refreshCard(store, rt, f, planId, channel, ts, outcome);
  else if (p.response_url) await respondUrl(f, p.response_url, { replace_original: true, text: outcome });
}

async function onChangesClick(rt: RuntimeContext, f: SlackFetch, p: z.infer<typeof BlockActions>, planId: string) {
  const channel = p.container?.channel_id ?? p.channel?.id ?? "";
  const ts = p.container?.message_ts ?? p.message?.ts ?? "";
  const origin = appUrl(rt.env);
  const bundle = await loadPlanBundle(planId, origin).catch(() => null);
  const brand = bundle ? (bundle.brief.brandSample ? `${bundle.brief.brandName} (sample brand)` : bundle.brief.brandName) : planId;
  const meta: ChangesMeta = { planId, channel, ts };
  await openView(f, rt.env.WALLSPACE_SLACK_BOT_TOKEN, { trigger_id: p.trigger_id, view: changesModal(meta, brand) });
}

async function onChangesSubmit(rt: RuntimeContext, f: SlackFetch, p: z.infer<typeof ViewSubmission>, meta: ChangesMeta, text: string) {
  const store = getStore(rt.env);
  const user = who(p.user);
  await store.recordEvent({
    provider: "slack", planId: meta.planId, direction: "in", kind: "changes-requested",
    summary: `Changes requested in Slack by @${user}: ${text}`.slice(0, 240),
    detail: { user: p.user.id, text, channel: meta.channel, ts: meta.ts },
  });
  if (meta.channel && meta.ts) {
    await refreshCard(store, rt, f, meta.planId, meta.channel, meta.ts, `:memo: Changes requested by <@${p.user.id}>: ${text.slice(0, 500)}`);
  }
}

export async function handleSlackInteract(req: Request, rt: RuntimeContext, deps: InteractDeps = {}): Promise<Response> {
  const secret = rt.env.WALLSPACE_SLACK_SIGNING_SECRET;
  if (!secret) return bad("Slack signing secret is not configured", "slack_not_configured", 503);

  const raw = await req.text();
  const sig = await verifySlackSignature(raw, { timestamp: req.headers.get("x-slack-request-timestamp"), signature: req.headers.get("x-slack-signature") }, secret, deps.now?.().getTime());
  if (!sig.ok) return bad("invalid signature", `signature_${sig.reason}`, 401);

  const payloadRaw = new URLSearchParams(raw).get("payload");
  if (!payloadRaw) return bad("missing payload", "bad_payload", 400);
  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return bad("payload is not JSON", "bad_payload", 400);
  }
  const f: SlackFetch = deps.fetchImpl ?? ((...a) => fetch(...a));
  const fail = (e: unknown) => {
    const store = getStore(rt.env);
    return store.recordEvent({ provider: "slack", planId: null, direction: "in", kind: "error", summary: `Slack interaction failed: ${e instanceof Error ? e.message : "error"}`.slice(0, 240) }).then(() => undefined);
  };

  const type = (payload as { type?: string } | null)?.type;
  if (type === "block_actions") {
    const p = BlockActions.safeParse(payload);
    if (!p.success) return bad("unexpected block_actions shape", "bad_payload", 400);
    const action = p.data.actions[0];
    const value = SlackButtonValue.safeParse(action.value ? safeJson(action.value) : null);
    if (!value.success) return ack(); // e.g. the Open plan link button: nothing to do
    const planId = value.data.planId;
    if (action.action_id === "wallspace_approve") rt.waitUntil(onApprove(rt, f, p.data, planId).catch(fail));
    else if (action.action_id === "wallspace_changes") rt.waitUntil(onChangesClick(rt, f, p.data, planId).catch(fail));
    return ack();
  }

  if (type === "view_submission") {
    const p = ViewSubmission.safeParse(payload);
    if (!p.success || p.data.view.callback_id !== SLACK_CHANGES_CALLBACK) return ack();
    const metaParsed = z.object({ planId: z.string(), channel: z.string(), ts: z.string() }).safeParse(safeJson(p.data.view.private_metadata ?? ""));
    if (!metaParsed.success) return bad("modal metadata missing", "bad_payload", 400);
    const text = (p.data.view.state.values.changes?.text?.value ?? "").trim();
    if (!text) return Response.json({ response_action: "errors", errors: { changes: "Say what should change" } });
    rt.waitUntil(onChangesSubmit(rt, f, p.data, metaParsed.data, text.slice(0, 1000)).catch(fail));
    return ack();
  }

  return ack();
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
