import { beforeEach, describe, expect, it } from "vitest";
import { fakeSlack, samplePlanBundle, signedSlackInteraction } from "@/mocks/connectors-comms";
import type { RuntimeContext } from "../composio/env";
import { setPlanLoader } from "../composio/plans";
import { getStore, resetMemoryStore } from "../composio/store";
import { handleSlackInteract } from "./interact";

const SECRET = "slack-signing-secret";
const bundle = samplePlanBundle("plan-slack-1");

function runtime() {
  const pending: Promise<unknown>[] = [];
  const rt: RuntimeContext = { env: { WALLSPACE_SLACK_SIGNING_SECRET: SECRET, WALLSPACE_SLACK_BOT_TOKEN: "xoxb-test" }, waitUntil: (p) => void pending.push(p) };
  return { rt, flush: () => Promise.all(pending) };
}

const click = (actionId: string) => ({
  type: "block_actions", user: { id: "U123", name: "dana" }, trigger_id: "trig.1", response_url: "https://hooks.slack.com/actions/T/1/x",
  container: { channel_id: "C0APPROVALS", message_ts: "1761800000.000100" },
  actions: [{ action_id: actionId, value: JSON.stringify({ planId: "plan-slack-1" }) }],
});

beforeEach(() => {
  resetMemoryStore();
  setPlanLoader(async () => bundle);
});

describe("Slack interactivity", () => {
  it("rejects a bad signature and a stale timestamp without touching state", async () => {
    const { rt, flush } = runtime();
    const bad = await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_approve"), { badSig: true }), rt);
    expect(bad.status).toBe(401);
    const stale = await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_approve"), { ts: Math.floor(Date.now() / 1000) - 900 }), rt);
    expect(stale.status).toBe(401);
    await flush();
    expect(await getStore(rt.env).listEvents({ limit: 5 })).toHaveLength(0);
  });

  it("acks Approve at once, records the event and updates the card", async () => {
    const { rt, flush } = runtime();
    const slack = fakeSlack();
    const res = await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_approve")), rt, { fetchImpl: slack.fetchImpl });
    expect(res.status).toBe(200);
    await flush();
    const events = await getStore(rt.env).listEvents({ planId: "plan-slack-1", limit: 5 });
    expect(events[0]).toMatchObject({ kind: "approved", direction: "in", provider: "slack" });
    expect(events[0].summary).toBe("Approved in Slack by @dana");
    const update = slack.calls.find((c) => c.url.endsWith("chat.update"));
    expect((update?.body as { text: string }).text).toContain("Approved by <@U123>");
    // double click: still 200, no second event, no second update
    await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_approve")), rt, { fetchImpl: slack.fetchImpl });
    await flush();
    expect(await getStore(rt.env).listEvents({ planId: "plan-slack-1", limit: 5 })).toHaveLength(1);
    expect(slack.calls.filter((c) => c.url.endsWith("chat.update"))).toHaveLength(1);
  });

  it("opens the changes modal with the plan carried in private_metadata", async () => {
    const { rt, flush } = runtime();
    const slack = fakeSlack();
    const res = await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_changes")), rt, { fetchImpl: slack.fetchImpl });
    expect(res.status).toBe(200);
    await flush();
    const open = slack.calls.find((c) => c.url.endsWith("views.open"));
    const view = (open?.body as { trigger_id: string; view: { callback_id: string; private_metadata: string; blocks: { block_id?: string }[] } });
    expect(view.trigger_id).toBe("trig.1");
    expect(view.view.callback_id).toBe("wallspace_changes_modal");
    expect(JSON.parse(view.view.private_metadata)).toEqual({ planId: "plan-slack-1", channel: "C0APPROVALS", ts: "1761800000.000100" });
    expect(view.view.blocks.some((b) => b.block_id === "changes")).toBe(true);
  });

  const submit = (text: string) => ({
    type: "view_submission", user: { id: "U123", name: "dana" },
    view: { callback_id: "wallspace_changes_modal", private_metadata: JSON.stringify({ planId: "plan-slack-1", channel: "C0APPROVALS", ts: "1761800000.000100" }), state: { values: { changes: { text: { value: text } } } } },
  });

  it("stores the requested changes and shows them on the card", async () => {
    const { rt, flush } = runtime();
    const slack = fakeSlack();
    const res = await handleSlackInteract(await signedSlackInteraction(SECRET, submit("Swap ATL-0104 for a face nearer the venue")), rt, { fetchImpl: slack.fetchImpl });
    expect(res.status).toBe(200);
    await flush();
    const events = await getStore(rt.env).listEvents({ planId: "plan-slack-1", limit: 5 });
    expect(events[0]).toMatchObject({ kind: "changes-requested" });
    expect(events[0].summary).toContain("Swap ATL-0104");
    expect(events[0].detail).toMatchObject({ text: "Swap ATL-0104 for a face nearer the venue" });
    expect(slack.calls.some((c) => c.url.endsWith("chat.update"))).toBe(true);
  });

  it("returns a field error for an empty changes request", async () => {
    const { rt } = runtime();
    const res = await handleSlackInteract(await signedSlackInteraction(SECRET, submit("   ")), rt);
    expect(await res.json()).toEqual({ response_action: "errors", errors: { changes: "Say what should change" } });
  });

  it("is unavailable without a signing secret", async () => {
    const res = await handleSlackInteract(await signedSlackInteraction(SECRET, click("wallspace_approve")), { env: {}, waitUntil: () => undefined });
    expect(res.status).toBe(503);
  });
});
