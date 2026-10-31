import { describe, expect, it } from "vitest";
import { TokenFactory } from "../models";
import { writeCopy, type CopyInput } from "./copy";

// A fake Token Factory that answers each copy call from a script and records the prompts it was sent.
function fake(script: string[][]) {
  const prompts: string[] = [];
  let n = 0;
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    prompts.push(String(body.messages[body.messages.length - 1].content));
    const texts = script[Math.min(n++, script.length - 1)];
    const content = JSON.stringify({ lines: texts.map((text) => ({ text, rationale: "from block tags" })) });
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }), { status: 200, headers: { "x-request-id": `req-${n}` } });
  }) as unknown as typeof fetch;
  return { tf: new TokenFactory({ apiKey: "k", fetchImpl }), prompts, calls: () => n };
}

const input: CopyInput = {
  brief: { brandName: "Porchlight Comedy Tour (sample brand)", brandVoice: null, audienceText: "people who would go to a comedy club on a Tuesday", loves: ["stand-up comedy"], flightStart: "2026-11-16", flightWeeks: 4 },
  face: { id: "ATL-0105", name: "Moreland Ave", neighbourhood: "Little Five Points", kind: "bulletin" },
  topTags: ["performing arts theater"], events: [],
};

describe("writeCopy policy", () => {
  it("keeps three valid lines from one call", async () => {
    const f = fake([["West End knows the punchline.", "Laugh louder, Midtown.", "Standup after dark."]]);
    const r = await writeCopy(f.tf, input);
    expect(f.calls()).toBe(1);
    expect(r.lines.map((l) => l.text)).toHaveLength(3);
    expect(r.needsHuman).toBeNull();
    expect(r.steps).toHaveLength(1);
  });

  it("rejects a fragment instead of trimming it, retries once with the failure stated, and keeps the accepted lines", async () => {
    const f = fake([
      ["Little Five Points laughs loudest. Catch the.", "Laugh louder, Midtown.", "Standup after dark."],
      ["Little Five laughs loudest."],
    ]);
    const r = await writeCopy(f.tf, input);
    expect(f.calls()).toBe(2);
    expect(f.prompts[1]).toContain('"Little Five Points laughs loudest. Catch the." (ends mid-phrase on "the")');
    expect(r.lines.map((l) => l.text)).toEqual(["Laugh louder, Midtown.", "Standup after dark.", "Little Five laughs loudest."]);
    expect(r.needsHuman).toBeNull();
    expect(r.steps).toHaveLength(2); // every attempt is a RunStep
    expect(r.steps[0].status).toBe("error");
    expect(r.steps[0].summary).toContain("rejected 1 of 3");
    expect(r.steps[1].status).toBe("ok");
  });

  it("drops a variant that is still bad after the retry and ships two valid lines without a redraft", async () => {
    const f = fake([["Laugh louder, Midtown.", "Standup after dark.", "Come laugh at the"], ["Still laughs at the"]]);
    const r = await writeCopy(f.tf, input);
    expect(f.calls()).toBe(2);
    expect(r.lines).toHaveLength(2);
    expect(r.lines.every((l) => !/\bthe$/i.test(l.text))).toBe(true);
    expect(r.needsHuman).toBeNull();
  });

  it("makes one redraft call when fewer than two lines are valid, then accepts it", async () => {
    const f = fake([
      ["Catch the.", "Laughs at the", "One two three four five six seven eight."],
      ["Laugh with", "Standup after dark."],
      ["Laugh louder, Midtown.", "West End knows the punchline."],
    ]);
    const r = await writeCopy(f.tf, input);
    expect(f.calls()).toBe(3);
    expect(f.prompts[2]).toContain("Write 3 new lines from scratch");
    expect(r.lines.map((l) => l.text)).toEqual(["Standup after dark.", "Laugh louder, Midtown.", "West End knows the punchline."]);
    expect(r.needsHuman).toBeNull();
    expect(r.steps).toHaveLength(3);
  });

  it("marks the face copy needs a human and ships no fragment when the redraft also fails", async () => {
    const f = fake([["Catch the.", "Laughs at the", "Come and"], ["Catch the."], ["Laugh with", "Tickets for your"]]);
    const r = await writeCopy(f.tf, input);
    expect(f.calls()).toBe(3); // first attempt, one retry, one redraft, never more
    expect(r.lines).toHaveLength(0);
    expect(r.needsHuman).toMatch(/^Copy needs a human: 0 of 3 lines/);
    expect(r.steps).toHaveLength(3);
    expect(r.steps.every((s) => s.status === "error")).toBe(true);
  });

  it("states a redraft note from the reviewer on the first call", async () => {
    const f = fake([["Laugh louder, Midtown.", "Standup after dark.", "West End knows the punchline."]]);
    const r = await writeCopy(f.tf, { ...input, redraftNote: "clash: same line as ATL-0002" });
    expect(f.prompts[0]).toContain("clash: same line as ATL-0002");
    expect(r.steps[0].title).toMatch(/^redraft/);
  });
});
