import { beforeEach, describe, expect, it } from "vitest";
import { faces } from "@/data/faces";
import { fakeComposio, fakeSlack, sampleAudienceCard } from "@/mocks/connectors-comms";
import { ComposioClient } from "./client";
import type { RuntimeContext } from "./env";
import { dispatchPitch } from "./pitch";
import { setCardLoader } from "./pitch-source";
import type { ProviderCtx } from "./registry";
import { getStore, resetMemoryStore } from "./store";
import { matchReply } from "../mail/replies";

const face = faces.find((f) => f.location === "sample")!;

function ctxWith(f: typeof fetch, env: RuntimeContext["env"] = { COMPOSIO_API_KEY: "k" }): ProviderCtx {
  const rt: RuntimeContext = { env, waitUntil: () => undefined };
  return { rt, store: getStore(env), composio: new ComposioClient({ apiKey: "k", fetchImpl: f }), userId: "wallspace-demo", origin: "https://wallspace.pages.dev" };
}

beforeEach(() => {
  resetMemoryStore();
  setCardLoader(async (id) => sampleAudienceCard(id));
});

describe("owner pitch", () => {
  it("validates provider, recipient and face", async () => {
    const ctx = ctxWith(fakeComposio().fetchImpl);
    await expect(dispatchPitch(ctx, face.id, { provider: "hubspot", to: "a@b.co" })).rejects.toMatchObject({ code: "unknown_provider" });
    await expect(dispatchPitch(ctx, face.id, { provider: "gmail", to: "nope" })).rejects.toMatchObject({ code: "bad_recipient" });
    await expect(dispatchPitch(ctx, "ATL-9999", { provider: "gmail", to: "brand@x.co" })).rejects.toMatchObject({ code: "face_not_found", status: 404 });
  });

  it("answers card_unavailable when the audience card cannot be produced", async () => {
    setCardLoader(async () => null);
    const ctx = ctxWith(fakeComposio({ accounts: [{ id: "ca_g", toolkit: "gmail" }] }).fetchImpl);
    await expect(dispatchPitch(ctx, face.id, { provider: "gmail", to: "brand@x.co" })).rejects.toMatchObject({ code: "card_unavailable", status: 503 });
  });

  it("emails the pitch sheet with card, link, sample labels and the privacy line, and logs it", async () => {
    const f = fakeComposio({ accounts: [{ id: "ca_g", toolkit: "gmail" }], tools: { GMAIL_SEND_EMAIL: { id: "m1", threadId: "t-p1" } } });
    const ctx = ctxWith(f.fetchImpl);
    const out = await dispatchPitch(ctx, face.id, { provider: "gmail", to: "brand@porchlight.example", note: "Thought of your fall tour" });
    expect(out).toMatchObject({ ok: true, provider: "gmail", externalId: "t-p1", url: `https://wallspace.pages.dev/faces/${face.id}` });
    const args = (f.calls.find((c) => c.url.includes("GMAIL_SEND_EMAIL"))?.body as { arguments: Record<string, string> }).arguments;
    expect(args.subject).toContain(`[WS:pitch-${face.id}]`);
    for (const needle of [face.name, "live comedy", "Porchlight Comedy Tour (sample brand)", "sample rate", "no device tracking", `/faces/${face.id}`, "Thought of your fall tour"]) expect(args.body).toContain(needle);
    const events = await ctx.store.listEvents({ planId: `pitch-${face.id}`, limit: 5 });
    expect(events[0]).toMatchObject({ kind: "sent", direction: "out", provider: "gmail" });
  });

  it("only a reply tied to a sent pitch is matched; strangers using the token are discarded", async () => {
    const ctx = ctxWith(fakeComposio({ accounts: [{ id: "ca_o", toolkit: "outlook" }] }).fetchImpl);
    await dispatchPitch(ctx, face.id, { provider: "outlook", to: "brand@porchlight.example" });
    const sent = await ctx.store.threadsForPlan(`pitch-${face.id}`, "outlook");
    expect(sent[0].token).toBe(`[WS:pitch-${face.id}]`);
    expect(matchReply({ threadId: null, subject: `Re: pitch [WS:pitch-${face.id}]` }, sent, "outlook")).toBe(`pitch-${face.id}`);
    expect(matchReply({ threadId: null, subject: "Re: [WS:pitch-ATL-0001]" }, sent, "outlook")).toBeNull();
  });

  it("shares internally in Slack without approval buttons", async () => {
    const slack = fakeSlack();
    const realFetch = globalThis.fetch;
    globalThis.fetch = slack.fetchImpl;
    try {
      const ctx = ctxWith(fakeComposio().fetchImpl, { COMPOSIO_API_KEY: "k", WALLSPACE_SLACK_BOT_TOKEN: "xoxb-t", WALLSPACE_SLACK_CHANNEL: "C0APPROVALS" });
      const out = await dispatchPitch(ctx, face.id, { provider: "slack" });
      expect(out.externalId).toBe("1761800000.000100");
      const body = slack.calls[0].body as { blocks: { type: string; elements?: { action_id: string; url?: string }[] }[] };
      const actions = body.blocks.find((b) => b.type === "actions")?.elements ?? [];
      expect(actions).toHaveLength(1);
      expect(actions[0].url).toContain(`/faces/${face.id}`);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
