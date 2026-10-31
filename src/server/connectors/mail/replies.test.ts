import { describe, expect, it } from "vitest";
import { fakeTokenFactory } from "@/mocks/connectors-comms";
import { TokenFactory } from "@/server/models";
import { classifyReply, newTextOf } from "./classify";
import { messagesOf, normalizeGmail, normalizeOutlook } from "./normalize";
import { looksLikeReply, matchReply, planIdFromSubject } from "./replies";

const tf = (content: string) => new TokenFactory({ apiKey: "k", mode: "live", fetchImpl: fakeTokenFactory(content) });

describe("reply matching", () => {
  const threads = [{ planId: "plan-a", provider: "gmail", threadId: "t-1" }, { planId: "plan-b", provider: "gmail", threadId: "t-2" }];

  it("matches by thread id first", () => {
    expect(matchReply({ threadId: "t-2", subject: "Re: whatever" }, threads, "gmail")).toBe("plan-b");
  });
  it("falls back to the subject token", () => {
    const sent = [{ planId: "plan-porchlight-1", provider: "outlook", threadId: null }];
    expect(matchReply({ threadId: null, subject: "Re: Wallspace plan for Porchlight [WS:plan-porchlight-1]" }, sent, "outlook")).toBe("plan-porchlight-1");
  });
  it("discards a token that matches nothing Wallspace sent", () => {
    expect(matchReply({ threadId: null, subject: "Re: [WS:plan-porchlight-1]" }, [], "outlook")).toBeNull();
    expect(matchReply({ threadId: null, subject: "Re: [WS:plan-porchlight-1]" }, [{ planId: "plan-porchlight-1", provider: "gmail", threadId: "t" }], "outlook")).toBeNull();
  });
  it("returns null when nothing matches", () => {
    expect(matchReply({ threadId: "zzz", subject: "lunch?" }, threads, "gmail")).toBeNull();
    expect(planIdFromSubject("no token here")).toBeNull();
  });
  it("tells a reply from our own outgoing message", () => {
    const thread = { recipient: "owner@peachline.example", messageId: "m-out" };
    expect(looksLikeReply({ subject: "Wallspace plan [WS:p]", from: "me@gmail.com", messageId: "m-out" }, thread)).toBe(false);
    expect(looksLikeReply({ subject: "Wallspace plan [WS:p]", from: "me@gmail.com", messageId: "m-x" }, thread)).toBe(false);
    expect(looksLikeReply({ subject: "Re: Wallspace plan [WS:p]", from: "Dana <owner@peachline.example>", messageId: "m-in" }, thread)).toBe(true);
    expect(looksLikeReply({ subject: "new subject", from: "Dana <owner@peachline.example>", messageId: "m-in" }, thread)).toBe(true);
  });
});

describe("reply text and normalizers", () => {
  it("keeps only the new text of a reply", () => {
    const body = "Works for us, confirmed.\n\nOn Fri, 30 Oct 2026 at 15:00, Wallspace <a@b.co> wrote:\n> 8 faces\n> $39,600";
    expect(newTextOf(body)).toBe("Works for us, confirmed.");
  });
  it("normalizes a Gmail trigger payload", () => {
    const m = normalizeGmail({ message_id: "m1", thread_id: "t1", sender: "Dana <d@x.co>", subject: "Re: plan", message_text: "<p>Yes</p>", message_timestamp: "2026-10-30T08:00:00Z" });
    expect(m).toMatchObject({ messageId: "m1", threadId: "t1", from: "Dana <d@x.co>", text: "Yes", receivedAt: "2026-10-30T08:00:00.000Z" });
  });
  it("normalizes an Outlook Graph message, trigger-wrapped or bare", () => {
    const graph = { id: "o1", subject: "Re: plan", conversationId: "c1", from: { emailAddress: { address: "d@x.co" } }, receivedDateTime: "2026-10-30T08:00:00Z", body: { contentType: "html", content: "<div>Counter: $5,400</div>" } };
    expect(normalizeOutlook(graph)).toMatchObject({ messageId: "o1", threadId: "c1", from: "d@x.co", text: "Counter: $5,400" });
    expect(normalizeOutlook({ event_type: "created", outlook_message: graph })?.messageId).toBe("o1");
    expect(normalizeOutlook({ nothing: true })).toBeNull();
  });
  it("finds the message list however the tool nests it", () => {
    expect(messagesOf({ response_data: { value: [{ id: 1 }, { id: 2 }] } })).toHaveLength(2);
    expect(messagesOf({ messages: [{ id: 1 }] })).toHaveLength(1);
    expect(messagesOf(null)).toEqual([]);
  });
});

describe("reply classification", () => {
  it("parses a counter-offer with a rate", async () => {
    const c = await classifyReply(tf('{"class":"counter-offer","summary":"Wants $5,400 a month for ATL-0104","proposedRateUsd":5400}'), "Can we do $5,400 for the Moreland face?");
    expect(c).toMatchObject({ class: "counter-offer", proposedRateUsd: 5400 });
  });
  it("accepts JSON wrapped in fences and thinking", async () => {
    const c = await classifyReply(tf('<think>hm</think>```json\n{"class":"confirmed","summary":"Agrees to the plan","proposedRateUsd":null}\n```'), "Looks good, confirmed.");
    expect(c.class).toBe("confirmed");
  });
  it("covers unavailable and question", async () => {
    expect((await classifyReply(tf('{"class":"unavailable","summary":"ATL-0102 is booked","proposedRateUsd":null}'), "0102 is taken that month")).class).toBe("unavailable");
    expect((await classifyReply(tf('{"class":"question","summary":"Asks for creative specs","proposedRateUsd":null}'), "What file size do you need?")).class).toBe("question");
  });
  it("falls back to 'other' when the model output is invalid twice", async () => {
    const c = await classifyReply(tf("not json at all"), "ok");
    expect(c.class).toBe("other");
  });
  it("does not call the model for an empty reply", async () => {
    expect((await classifyReply(tf("{}"), "> quoted only")).summary).toBe("Empty reply");
  });
});
