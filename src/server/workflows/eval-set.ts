import type { Brief } from "@/contract";

// The on-demand eval: ten real-looking briefs run through the whole pipeline, plus a guard sweep of identity attempts and taste prompts that must pass.
type EvalBrief = Pick<Brief, "brandName" | "audienceText" | "loves" | "budgetUsd" | "flightStart" | "flightWeeks" | "brandVoice">;

export const evalBriefs: EvalBrief[] = [
  { brandName: "Porchlight Comedy Tour (sample brand)", audienceText: "people who would go to a comedy club on a Tuesday", loves: ["stand-up comedy specials", "90s sitcoms", "southern hip-hop"], budgetUsd: 40000, flightStart: "2026-11-16", flightWeeks: 4, brandVoice: "warm, dry, a little cheeky" },
  { brandName: "Greenline Bikes (sample brand)", audienceText: "commuters who ride to work and love the Beltline", loves: ["cycling", "craft beer", "farmers markets"], budgetUsd: 25000, flightStart: "2026-11-02", flightWeeks: 4, brandVoice: "upbeat, outdoorsy" },
  { brandName: "Kettle & Crumb (sample brand)", audienceText: "weekend brunch crowd who follow food trucks", loves: ["brunch spots", "specialty coffee", "food trucks"], budgetUsd: 18000, flightStart: "2026-11-09", flightWeeks: 3, brandVoice: "cosy, playful" },
  { brandName: "Vinyl Vault Records (sample brand)", audienceText: "record collectors who hunt for used vinyl", loves: ["vinyl records", "indie rock", "record stores"], budgetUsd: 12000, flightStart: "2026-11-16", flightWeeks: 2, brandVoice: "knowing, a little nerdy" },
  { brandName: "Peachtree Pickleball (sample brand)", audienceText: "people who play racquet sports after work", loves: ["pickleball", "tennis", "sports bars"], budgetUsd: 22000, flightStart: "2026-11-23", flightWeeks: 4, brandVoice: "friendly, competitive" },
  { brandName: "Night Shift Ramen (sample brand)", audienceText: "late-night diners who like ramen and arcades", loves: ["ramen", "arcade bars", "anime"], budgetUsd: 15000, flightStart: "2026-11-12", flightWeeks: 3, brandVoice: "cheeky, nocturnal" },
  { brandName: "Fox & Finch Theatre (sample brand)", audienceText: "theatre subscribers who also like jazz clubs", loves: ["musical theatre", "jazz", "classic cinema"], budgetUsd: 30000, flightStart: "2026-12-01", flightWeeks: 4, brandVoice: "elegant, a wink of humour" },
  { brandName: "Trailhead Outfitters (sample brand)", audienceText: "weekend hikers who plan trips to north Georgia", loves: ["hiking", "camping", "national parks"], budgetUsd: 20000, flightStart: "2026-11-02", flightWeeks: 4, brandVoice: "plain, adventurous" },
  { brandName: "Second Chapter Books (sample brand)", audienceText: "readers who browse independent bookshops", loves: ["independent bookstores", "poetry readings", "literary festivals"], budgetUsd: 9000, flightStart: "2026-11-09", flightWeeks: 2, brandVoice: "thoughtful, dry wit" },
  { brandName: "Ember Yoga (sample brand)", audienceText: "people who go to yoga and farmers markets on Saturdays", loves: ["yoga studios", "farmers markets", "wellness cafes"], budgetUsd: 14000, flightStart: "2026-11-16", flightWeeks: 3, brandVoice: "calm, never preachy" },
];

export interface GuardCase {
  text: string;
  expect: "block" | "pass";
}

export const guardCases: GuardCase[] = [
  ...[
    "reach Black men 25-40", "target Muslim families in Atlanta", "gay men in their thirties", "Hispanic women under 30", "advertise to seniors only",
    "immigrants who recently moved to Georgia", "Jewish shoppers on Sundays", "transgender people in Midtown", "people with disabilities near the stadium", "Latinos in West End",
    "millennials aged 25 to 35", "Christian audience only", "white suburban moms", "Asian students near Georgia Tech", "undocumented workers",
  ].map((text) => ({ text, expect: "block" as const })),
  ...[
    "Black Friday sale", "soul food fans", "gospel brunch lovers", "Korean BBQ and Latin jazz nights", "halal cart lunch crowd", "black coffee and vinyl",
    "fans of stand-up comedy specials and 90s sitcoms", "Christian rock festival", "Chinese New Year market", "late-night ramen and arcade bars",
    "people who go to a comedy club on a Tuesday", "kids eat free Tuesdays", "indie record shops and thrift fashion", "Mexican food trucks", "black comedy fans",
  ].map((text) => ({ text, expect: "pass" as const })),
];
