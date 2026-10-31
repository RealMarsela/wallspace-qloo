import { describe, expect, it } from "vitest";
import { checkLine, sortLines } from "./copy-check";

describe("copy line validator", () => {
  it("rejects fragments that end mid-phrase", () => {
    for (const t of ["Catch the.", "Laughs at the", "Little Five Points laughs loudest. Catch the.", "Come laugh with", "90s sitcom jokes + southern beats. Who's.", "Who\u2019s next? Let's.", "Tickets for your", "Funny and", "Laugh louder, Midtown, and", "Nov 21 at", "Laughs louder, ", "Tonight we laugh -", "Tonight we laugh...", "Westside jokes land because"]) {
      expect(checkLine(t).ok, t).toBe(false);
    }
  });

  it("rejects more than 7 words, never trims", () => {
    const r = checkLine("Little Five Points laughs loudest every single Friday night");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/9 words/);
    expect(checkLine("One two three four five six seven eight.").ok).toBe(false);
  });

  it("rejects single words, hashtags, emoji and unbalanced quotes", () => {
    for (const t of ["", "Laugh.", "Laugh louder #comedy", "Laugh louder \u{1F602}", 'Say "hello there', "Say “hello there", "Laugh (loudly now", "He said \"stop"]) {
      expect(checkLine(t).ok, t).toBe(false);
    }
  });

  it("accepts good lines up to 7 words", () => {
    for (const t of [
      "West End knows the punchline.", "Little Five laughs louder. Nov 21.", "Laugh louder, Midtown.", "Midtown never sleeps. Neither do we.", "One two three four five six seven.",
      "Wake up and laugh", "Catch that.", "Game over, Atlanta!", 'Sweet Auburn says "laugh."', "Is that a punchline? Yes.", "Tonight in Home Park: standup", "Yes we can laugh.", "Who's next? Comedy's here.", "Guess who.",
    ]) {
      expect(checkLine(t), t).toEqual({ ok: true });
    }
  });

  it("sortLines keeps the first of a duplicate and explains each rejection", () => {
    const s = sortLines([{ text: "Laugh louder, Midtown." }, { text: "laugh louder midtown" }, { text: "Catch the." }], []);
    expect(s.valid).toHaveLength(1);
    expect(s.rejected.map((r) => r.reason)).toEqual(['duplicate of another line', 'ends mid-phrase on "the"']);
    expect(sortLines([{ text: "Laugh louder, Midtown." }], ["laugh louder midtown"]).valid).toHaveLength(0);
  });
});
