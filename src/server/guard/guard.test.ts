import { describe, expect, it } from "vitest";
import { guardText } from "./index";
import { TokenFactory } from "../models";

const status = async (t: string, o: Parameters<typeof guardText>[1] = {}) => (await guardText(t, o)).verdict.status;

describe("identity targeting is refused", () => {
  const refused = [
    "reach Black men 25-40",
    "target Muslim families in Atlanta",
    "gay men in their thirties",
    "Hispanic women under 30",
    "we want to reach white people who vote",
    "people with disabilities near the stadium",
    "advertise to seniors",
    "immigrants who recently moved",
    "Jewish shoppers on Sundays",
    "transgender people in Midtown",
    "target millennials",
    "people aged 25 to 40",
    "men 25-40 who love comedy",
    "Latinos in West End",
    "Christian audience only",
  ];
  for (const t of refused) it(`blocks: ${t}`, async () => expect(await status(t)).toBe("blocked"));

  it("answers reach Black men 25-40 with a taste suggestion built from the planner's chips", async () => {
    const r = await guardText("reach Black men 25-40", { loves: ["stand-up specials", "southern hip-hop"] });
    expect(r.verdict).toMatchObject({ status: "blocked", engine: "live-guard", suggestion: "fans of stand-up specials and southern hip-hop" });
    expect(r.verdict.reasons[0]).toMatch(/race/);
    expect(r.path).toBe("deterministic");
    expect(r.ms).toBeLessThan(50);
  });
  it("pulls a taste suggestion out of the sentence when there are no chips", async () => {
    const r = await guardText("Black men who love stand-up comedy and hip-hop");
    expect(r.verdict.suggestion).toBe("fans of stand-up comedy and hip-hop");
  });
});

describe("a refused brief always carries a taste suggestion", () => {
  it("bare identity phrase with no chips gets the generic taste prompt", async () => {
    const r = await guardText("reach Black men 25 to 40");
    expect(r.verdict.status).toBe("blocked");
    expect(r.verdict.suggestion).toMatch(/what they love/);
  });
  it("bare phrase with chips offers the chips as the rewrite", async () => {
    const r = await guardText("reach Black men 25 to 40", { loves: ["stand-up comedy specials", "southern hip-hop"] });
    expect(r.verdict.suggestion).toBe("fans of stand-up comedy specials and southern hip-hop");
  });
  it("the fail-closed path (no model) also suggests", async () => {
    expect((await guardText("queer")).verdict.suggestion).toBeTruthy();
  });
});

describe("taste words pass (no false positives)", () => {
  const passes = [
    "Black Friday sale",
    "soul food fans",
    "gospel brunch lovers",
    "fans of stand-up comedy specials, 90s sitcoms and southern hip-hop",
    "Korean BBQ and Latin jazz nights",
    "black coffee and vinyl",
    "halal cart lunch crowd",
    "Christian rock festival",
    "black comedy fans",
    "indie record shops and thrift fashion",
    "kids eat free Tuesdays",
    "people who go to a comedy club on a Tuesday",
    "Chinese New Year market",
    "white christmas movie marathon",
    "Mexican food trucks",
    "late-night ramen and arcade bars",
  ];
  for (const t of passes) it(`passes: ${t}`, async () => expect(await status(t)).toBe("pass"));
});

describe("copy lines", () => {
  it("refuses health and financial claims", async () => {
    expect(await status("Laughter cures anxiety.", { kind: "copy" })).toBe("blocked");
    expect(await status("Earn $5,000 a week, guaranteed returns", { kind: "copy" })).toBe("blocked");
    expect(await status("Lose 10 pounds at the show", { kind: "copy" })).toBe("blocked");
  });
  it("passes ordinary copy", async () => {
    expect(await status("West End knows the punchline.", { kind: "copy" })).toBe("pass");
    expect(await status("Little Five laughs louder. Nov 21.", { kind: "copy" })).toBe("pass");
    expect(await status("Treats for Tuesday, jokes all week.", { kind: "copy" })).toBe("pass");
  });
  it("refuses a line that addresses an identity group", async () => {
    expect(await status("Hey Black community, the show is for you", { kind: "copy" })).toBe("blocked");
  });
});

describe("ambiguous words go to the model, and fail closed without one", () => {
  const fake = (verdict: string) =>
    new TokenFactory({
      apiKey: "k",
      fetchImpl: (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ verdict, reason: "names a venue", suggestion: null }) } }], usage: { prompt_tokens: 50, completion_tokens: 10 } }), { status: 200 })) as unknown as typeof fetch,
    });
  it("asks Lightning when a group word stands alone", async () => {
    const r = await guardText("Korean", { tf: fake("pass") });
    expect(r.path).toBe("model");
    expect(r.verdict.status).toBe("pass");
    expect(r.steps[0].role).toBe("lightning");
  });
  it("fails closed when no model is available", async () => {
    expect(await status("queer")).toBe("blocked");
  });
});
