import { beforeEach, describe, expect, it } from "vitest";
import { fakeComposio, fakeSlack, fakeTokenFactory, samplePlanBundle, signedComposioDelivery } from "@/mocks/connectors-comms";
import { TokenFactory } from "@/server/models";
import { registerSender } from "./registry";
import { ComposioClient } from "./client";
import { dispatchSend } from "./dispatch";
import type { ConnectorEnv, RuntimeContext } from "./env";
import { setPlanLoader } from "./plans";
import type { ProviderCtx } from "./registry";
import { getStore, resetMemoryStore } from "./store";
import { handleComposioWebhook } from "./webhook";
import { setTokenFactory } from "../mail/replies";
import { resetSyncCache, syncPlanReplies, syncRecentReplies } from "../mail/sync";
import { slackSender } from "../slack/send";
import "./boot";

const SECRET = "whsec-flow-test";
const bundle = samplePlanBundle("plan-flow-1");

function runtime(env: ConnectorEnv = {}) {
  const pending: Promise<unknown>[] = [];
  const rt: RuntimeContext = { env: { COMPOSIO_API_KEY: "k", WALLSPACE_COMPOSIO_WEBHOOK_SECRET: SECRET, ...env }, waitUntil: (p) => void pending.push(p) };
  return { rt, flush: () => Promise.all(pending) };
}

function ctxWith(rt: RuntimeContext, composioFetch: typeof fetch): ProviderCtx {
  return { rt, store: getStore(rt.env), composio: new ComposioClient({ apiKey: "k", fetchImpl: composioFetch }), userId: "wallspace-demo", origin: "https://wallspace.pages.dev" };
}

beforeEach(() => {
  resetMemoryStore();
  resetSyncCache();
  setPlanLoader(async (id) => (id === bundle.plan.id ? bundle : null));
  setTokenFactory(() => new TokenFactory({ apiKey: "k", mode: "live", fetchImpl: fakeTokenFactory('{"class":"counter-offer","summary":"Wants $5,400 a month","proposedRateUsd":5400}') }));
});

describe("send dispatcher", () => {
  it("rejects unknown providers, missing recipients and unknown plans", async () => {
    const { rt } = runtime();
    const ctx = ctxWith(rt, fakeComposio().fetchImpl);
    await expect(dispatchSend(ctx, bundle.plan.id, { provider: "fax", to: "a@b.co" })).rejects.toMatchObject({ code: "unknown_provider", status: 400 });
    await expect(dispatchSend(ctx, bundle.plan.id, { provider: "gmail" })).rejects.toMatchObject({ code: "bad_recipient" });
    await expect(dispatchSend(ctx, bundle.plan.id, { provider: "outlook", to: "not-an-email" })).rejects.toMatchObject({ code: "bad_recipient" });
    await expect(dispatchSend(ctx, "nope", { provider: "gmail", to: "owner@peachline.example" })).rejects.toMatchObject({ code: "plan_not_found", status: 404 });
    await expect(dispatchSend(ctx, bundle.plan.id, "garbage")).rejects.toBeTruthy();
  });

  it("refuses to send when the provider is not connected", async () => {
    const { rt } = runtime();
    const ctx = ctxWith(rt, fakeComposio({ accounts: [] }).fetchImpl);
    await expect(dispatchSend(ctx, bundle.plan.id, { provider: "gmail", to: "owner@peachline.example" })).rejects.toMatchObject({ code: "not_connected" });
  });

  it("sends the plan through Gmail, stores the thread and logs the event", async () => {
    const { rt } = runtime();
    const f = fakeComposio({ accounts: [{ id: "ca_gmail", toolkit: "gmail" }], tools: { GMAIL_SEND_EMAIL: { id: "m-out", threadId: "t-9" } } });
    const ctx = ctxWith(rt, f.fetchImpl);
    const out = await dispatchSend(ctx, bundle.plan.id, { provider: "gmail", to: "owner@peachline.example", note: "Please confirm by Friday" });
    expect(out).toMatchObject({ ok: true, provider: "gmail", externalId: "t-9" });
    const exec = f.calls.find((c) => c.url.includes("/tools/execute/GMAIL_SEND_EMAIL"));
    const args = (exec?.body as { arguments: Record<string, unknown>; connected_account_id: string }).arguments;
    expect((exec?.body as { connected_account_id: string }).connected_account_id).toBe("ca_gmail");
    expect(args).toMatchObject({ recipient_email: "owner@peachline.example", is_html: true });
    expect(String(args.subject)).toContain("[WS:plan-flow-1]");
    expect(String(args.body)).toContain("https://wallspace.pages.dev/app/plans/plan-flow-1");
    expect(String(args.body)).toContain("Please confirm by Friday");
    expect(String(args.body)).toContain("https://wallspace.pages.dev/api/plans/plan-flow-1/export.openooh.json");
    const threads = await ctx.store.threadsForPlan(bundle.plan.id, "gmail");
    expect(threads[0]).toMatchObject({ threadId: "t-9", recipient: "owner@peachline.example" });
    expect((await ctx.store.listEvents({ planId: bundle.plan.id, limit: 5 }))[0]).toMatchObject({ kind: "sent", provider: "gmail" });
  });

  it("sends through Outlook with the subject token as the match key", async () => {
    const { rt } = runtime();
    const f = fakeComposio({ accounts: [{ id: "ca_out", toolkit: "outlook" }] });
    const ctx = ctxWith(rt, f.fetchImpl);
    const out = await dispatchSend(ctx, bundle.plan.id, { provider: "outlook", to: "owner@southside.example" });
    expect(out.externalId).toBeNull();
    expect(f.calls.some((c) => c.url.includes("/tools/execute/OUTLOOK_SEND_EMAIL"))).toBe(true);
    expect((await ctx.store.threadsForPlan(bundle.plan.id, "outlook"))[0]?.token).toBe("[WS:plan-flow-1]");
  });

  it("posts the Slack approval card with Block Kit buttons", async () => {
    const { rt } = runtime({ WALLSPACE_SLACK_BOT_TOKEN: "xoxb-test", WALLSPACE_SLACK_CHANNEL: "C0APPROVALS" });
    const slack = fakeSlack();
    registerSender("slack", slackSender(slack.fetchImpl));
    const ctx = ctxWith(rt, fakeComposio().fetchImpl);
    const out = await dispatchSend(ctx, bundle.plan.id, { provider: "slack" });
    expect(out.externalId).toBe("1761800000.000100");
    const body = slack.calls[0].body as { text: string; blocks: { type: string; elements?: { action_id: string; value?: string }[] }[] };
    expect(body.text).toBe("Approve plan for Porchlight Comedy Tour (sample brand): 8 faces, $39,600, flight 16 Nov");
    const actions = body.blocks.find((b) => b.type === "actions")?.elements ?? [];
    expect(actions.map((a) => a.action_id)).toEqual(["wallspace_approve", "wallspace_changes", "wallspace_open"]);
    expect(JSON.parse(actions[0].value ?? "{}")).toEqual({ planId: "plan-flow-1" });
  });

  it("requires a Slack channel", async () => {
    const { rt } = runtime({ WALLSPACE_SLACK_BOT_TOKEN: "xoxb-test" });
    registerSender("slack", slackSender(fakeSlack().fetchImpl));
    await expect(dispatchSend(ctxWith(rt, fakeComposio().fetchImpl), bundle.plan.id, { provider: "slack" })).rejects.toMatchObject({ code: "slack_no_channel" });
  });
});

describe("Composio webhook receiver", () => {
  const trigger = (data: Record<string, unknown>, slug = "GMAIL_NEW_GMAIL_MESSAGE") => ({
    id: "evt_1", type: "composio.trigger.message", timestamp: new Date().toISOString(),
    metadata: { trigger_slug: slug, connected_account_id: "ca_gmail", user_id: "wallspace-demo" }, data,
  });

  it("is unavailable until a secret is configured", async () => {
    const { rt } = runtime({ WALLSPACE_COMPOSIO_WEBHOOK_SECRET: undefined });
    const res = await handleComposioWebhook(await signedComposioDelivery(SECRET, trigger({})), rt);
    expect(res.status).toBe(503);
  });

  it("rejects bad and stale signatures", async () => {
    const { rt } = runtime();
    const bad = await signedComposioDelivery("wrong-secret", trigger({}));
    expect((await handleComposioWebhook(bad, rt)).status).toBe(401);
    const stale = await signedComposioDelivery(SECRET, trigger({}), { ts: Math.floor(Date.now() / 1000) - 3600 });
    const r = await handleComposioWebhook(stale, rt);
    expect(r.status).toBe(401);
    expect(((await r.json()) as { code: string }).code).toBe("signature_stale");
  });

  it("matches a Gmail reply to its plan, classifies it, and is idempotent", async () => {
    const { rt, flush } = runtime();
    const store = getStore(rt.env);
    await store.saveThread({ planId: bundle.plan.id, provider: "gmail", threadId: "t-9", messageId: "m-out", token: "[WS:plan-flow-1]", recipient: "owner@peachline.example", sentAt: new Date(Date.now() - 60_000).toISOString() });
    const reply = { message_id: "m-in-1", thread_id: "t-9", sender: "Dana <owner@peachline.example>", subject: "Re: Wallspace plan [WS:plan-flow-1]", message_text: "Can we do $5,400 for the Moreland face?\n\nOn Fri wrote:\n> old", message_timestamp: new Date().toISOString() };
    const req = await signedComposioDelivery(SECRET, trigger(reply), { id: "msg_a" });
    expect((await handleComposioWebhook(req, rt)).status).toBe(200);
    await flush();
    const events = await store.listEvents({ planId: bundle.plan.id, limit: 10 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "reply", direction: "in", provider: "gmail" });
    expect(events[0].summary).toContain("Counter-offer");
    expect(events[0].detail).toMatchObject({ class: "counter-offer", proposedRateUsd: 5400 });
    // same delivery id again: ignored; same message under a new delivery id: deduped by message id
    const again = await handleComposioWebhook(await signedComposioDelivery(SECRET, trigger(reply), { id: "msg_a" }), rt);
    expect(((await again.json()) as { duplicate?: boolean }).duplicate).toBe(true);
    await handleComposioWebhook(await signedComposioDelivery(SECRET, trigger(reply), { id: "msg_b" }), rt);
    await flush();
    expect(await store.listEvents({ planId: bundle.plan.id, limit: 10 })).toHaveLength(1);
  });

  it("ignores a message that matches no plan", async () => {
    const { rt, flush } = runtime();
    const msg = { message_id: "m-x", thread_id: "t-x", sender: "spam@x.co", subject: "Re: lunch", message_text: "yes", message_timestamp: new Date().toISOString() };
    await handleComposioWebhook(await signedComposioDelivery(SECRET, trigger(msg)), rt);
    await flush();
    expect(await getStore(rt.env).listEvents({ limit: 10 })).toHaveLength(0);
  });

  it("ignores triggers nobody registered a handler for", async () => {
    const { rt } = runtime();
    const res = await handleComposioWebhook(await signedComposioDelivery(SECRET, trigger({}, "SOME_OTHER_TRIGGER")), rt);
    expect(((await res.json()) as { ignored?: string }).ignored).toBe("SOME_OTHER_TRIGGER");
  });
});

describe("pull-side mail sync (no webhook needed)", () => {
  it("reads the Gmail thread, ingests only the reply, and does not double count", async () => {
    const { rt } = runtime();
    const sentAt = new Date(Date.now() - 120_000).toISOString();
    const thread = { messages: [
      { messageId: "m-out", threadId: "t-9", sender: "me@gmail.com", subject: "Wallspace plan [WS:plan-flow-1]", messageText: "plan", messageTimestamp: sentAt },
      { messageId: "m-in-2", threadId: "t-9", sender: "Dana <owner@peachline.example>", subject: "Re: Wallspace plan [WS:plan-flow-1]", messageText: "Confirmed, thanks.", messageTimestamp: new Date().toISOString() },
    ] };
    const f = fakeComposio({ accounts: [{ id: "ca_gmail", toolkit: "gmail" }], tools: { GMAIL_FETCH_MESSAGE_BY_THREAD_ID: thread } });
    const ctx = ctxWith(rt, f.fetchImpl);
    await ctx.store.saveThread({ planId: bundle.plan.id, provider: "gmail", threadId: "t-9", messageId: "m-out", token: "[WS:plan-flow-1]", recipient: "owner@peachline.example", sentAt });
    const first = await syncPlanReplies(ctx, bundle.plan.id);
    expect(first).toMatchObject({ checked: 1, newReplies: 1, errors: [] });
    const second = await syncPlanReplies({ ...ctx }, bundle.plan.id);
    expect(second.newReplies).toBe(0); // throttled or deduped
    expect(await ctx.store.listEvents({ planId: bundle.plan.id, limit: 10 })).toHaveLength(1);
  });
});

describe("poll path stays cheap and idempotent", () => {
  it("makes no Composio call when no mail was ever sent", async () => {
    const { rt } = runtime();
    const f = fakeComposio();
    const ctx = ctxWith(rt, f.fetchImpl);
    expect(await syncRecentReplies(ctx)).toEqual({ checked: 0, newReplies: 0, errors: [] });
    expect(await syncPlanReplies(ctx, bundle.plan.id)).toEqual({ checked: 0, newReplies: 0, errors: [] });
    expect(f.calls).toHaveLength(0);
  });

  it("looks up a missing account once, then skips Composio on the next polls", async () => {
    const { rt } = runtime();
    const f = fakeComposio({ accounts: [] });
    const ctx = ctxWith(rt, f.fetchImpl);
    await ctx.store.saveThread({ planId: bundle.plan.id, provider: "gmail", threadId: "t-1", messageId: "m", token: "[WS:plan-flow-1]", recipient: "o@x.co", sentAt: new Date().toISOString() });
    const a = await syncPlanReplies(ctx, bundle.plan.id);
    const b = await syncPlanReplies(ctx, bundle.plan.id);
    expect(a.errors).toEqual(["gmail is not connected"]);
    expect(b.errors).toEqual(["gmail is not connected"]);
    expect(f.calls).toHaveLength(1);
  });

  it("does nothing without a Composio key", async () => {
    const { rt } = runtime({ COMPOSIO_API_KEY: undefined });
    const f = fakeComposio();
    const ctx = ctxWith(rt, f.fetchImpl);
    await ctx.store.saveThread({ planId: bundle.plan.id, provider: "gmail", threadId: "t-1", messageId: "m", token: "x", recipient: null, sentAt: new Date().toISOString() });
    expect(await syncPlanReplies(ctx, bundle.plan.id)).toMatchObject({ checked: 0 });
    expect(f.calls).toHaveLength(0);
  });

  it("classifies a reply once however many times sync runs", async () => {
    const { rt } = runtime();
    let modelCalls = 0;
    const inner = fakeTokenFactory('{"class":"confirmed","summary":"Agrees","proposedRateUsd":null}');
    setTokenFactory(() => new TokenFactory({ apiKey: "k", mode: "live", fetchImpl: (async (...a: Parameters<typeof fetch>) => { modelCalls++; return inner(...a); }) as typeof fetch }));
    const sentAt = new Date(Date.now() - 120_000).toISOString();
    const thread = { messages: [{ messageId: "m-in", threadId: "t-9", sender: "o@peachline.example", subject: "Re: plan [WS:plan-flow-1]", messageText: "Confirmed.", messageTimestamp: new Date().toISOString() }] };
    const f = fakeComposio({ accounts: [{ id: "ca_gmail", toolkit: "gmail" }], tools: { GMAIL_FETCH_MESSAGE_BY_THREAD_ID: thread } });
    const ctx = ctxWith(rt, f.fetchImpl);
    const row = await ctx.store.saveThread({ planId: bundle.plan.id, provider: "gmail", threadId: "t-9", messageId: "m-out", token: "[WS:plan-flow-1]", recipient: "o@peachline.example", sentAt });
    for (let i = 0; i < 3; i++) {
      await ctx.store.touchThread(row.id, new Date(Date.now() - 60_000).toISOString()); // defeat the 10 s throttle
      await syncPlanReplies(ctx, bundle.plan.id);
    }
    expect(modelCalls).toBe(1);
    expect(await ctx.store.listEvents({ planId: bundle.plan.id, limit: 10 })).toHaveLength(1);
  });
});
