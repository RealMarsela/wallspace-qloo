// Starting points for the brief. Brands are fictional and labelled sample. The first one is the public sample plan's brief.
export interface Preset {
  id: string;
  label: string;
  brandName: string;
  loves: string[];
  audienceText: string;
  brandVoice: string;
  budgetUsd?: number;
  flightStart?: string;
  flightWeeks?: number;
}

export const samplePreset: Preset = {
  id: "sample",
  label: "Use the sample brief: Porchlight Comedy Tour",
  brandName: "Porchlight Comedy Tour (sample brand)",
  loves: ["stand-up comedy specials", "90s sitcoms", "southern hip-hop"],
  audienceText: "people who would go to a comedy club on a Tuesday night",
  brandVoice: "warm, dry, a little cheeky",
  budgetUsd: 40000,
  flightStart: "2026-11-16",
  flightWeeks: 4,
};

export const presets: Preset[] = [
  {
    id: "coffee",
    label: "Coffee roaster",
    brandName: "Cast Iron Coffee (sample brand)",
    loves: ["indie folk", "vinyl records", "natural wine"],
    audienceText: "slow-morning people who browse record shops on weekends",
    brandVoice: "quiet, dry, confident",
  },
  {
    id: "sneakers",
    label: "Running shoe",
    brandName: "Northside Runners (sample brand)",
    loves: ["trail running", "podcasts about endurance", "farmers markets"],
    audienceText: "weekend long-run crowd who plan routes around a good brunch",
    brandVoice: "upbeat, plain-spoken",
  },
];

/** Shown so a judge can watch the guard refuse identity targeting and offer a taste-based version. */
export const guardProbe = "reach Black men 25 to 40";

/** First Monday at least a week out: a realistic default flight start for an empty brief. */
export function nextFlightStart(now = Date.now()): string {
  const d = new Date(now + 7 * 86_400_000);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}

/** Plain-language gaps in a brief, checked before the API so the planner sees what to fill in. */
export function briefGaps(b: { brandName: string; loves: string[]; audienceText: string; budgetUsd: number }): string[] {
  const out: string[] = [];
  if (!b.brandName.trim()) out.push("Add the brand name.");
  if (b.loves.length === 0) out.push("Add at least one taste the fans share.");
  if (!b.audienceText.trim()) out.push("Describe the audience in a few words.");
  if (!(b.budgetUsd > 0)) out.push("Set a budget.");
  return out;
}
