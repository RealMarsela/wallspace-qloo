import { z } from "zod";
import { AudienceCardResponse, SendPlanResponse, type AudienceCard, type Face } from "@/contract";
import { ApiFailure } from "@/lib/api-client";
import { sampleFaces } from "@/mocks/faces-sample";
import { getJson, isMock, wait } from "@/components/site/request";

// Additive field from B1: where the card's numbers came from. Optional so older responses still parse.
export const CardSource = z.object({
  mode: z.string(),
  cached: z.boolean(), // true: a KV copy of an earlier live Qloo call
  requestIds: z.array(z.string()), // x-qloo-request-id of each live call behind this card
  label: z.string().nullable(),
});
export type CardSource = z.infer<typeof CardSource>;
export const CardResponse = AudienceCardResponse.extend({ source: CardSource.optional() });
export type CardData = z.infer<typeof CardResponse>;
export type PitchResult = z.infer<typeof SendPlanResponse>;

// Sample pools for mock mode only. Brand names are fictional and carry "(sample)"; real cards come from Qloo.
const TAGS = [
  "live comedy", "vinyl and record shops", "thrift fashion", "late-night ramen", "southern hip-hop", "craft beer",
  "indie film", "brunch", "sneaker culture", "community gardens", "jazz clubs", "street art", "trail running", "food halls",
];
const BRANDS = [
  "Ridgeline Outfitters (sample)", "Laugh Track+ streaming (sample)", "Fieldnote Sneakers (sample)", "Low Tide Coffee (sample)",
  "Westside Cycle Co. (sample)", "Pressed Records (sample)", "Hearth & Harvest Grocers (sample)", "Gridline Bikeshare (sample)",
];

function seedOf(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function pick<T>(pool: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  const count = Math.min(n, pool.length);
  for (let i = 0; out.length < count; i++) {
    let j = (seed + i * 7) % pool.length;
    while (used.has(j)) j = (j + 1) % pool.length; // linear probe: always terminates
    used.add(j);
    out.push(pool[j]);
  }
  return out;
}

export function sampleCard(face: Face): AudienceCard {
  const s = seedOf(face.id);
  const top = 0.95 - (s % 9) / 100;
  return {
    faceId: face.id,
    topTags: pick(TAGS, 6, s).map((name, i) => ({ name, score: +(top - i * 0.04).toFixed(2) })),
    brands: pick(BRANDS, 5, s >> 3).map((name, i) => ({
      name,
      qlooId: `sample-brand-${(s + i).toString(16).slice(-6)}`,
      score: +(top - 0.02 - i * 0.035).toFixed(2),
    })),
    generatedAt: "2026-10-30T06:00:00Z",
  };
}

/** GET /api/owner/faces/:id/card (lane B1). Mock mode builds a labelled sample card. */
export async function fetchCard(faceId: string): Promise<CardData> {
  if (isMock()) {
    await wait(220);
    const face = sampleFaces.find((f) => f.id === faceId);
    if (!face) throw new ApiFailure("No face with that id in the sample inventory.", 404, "not_found");
    const source = { mode: "mock", cached: false, requestIds: [], label: "sample data (development only)" };
    return CardResponse.parse({ card: sampleCard(face), face, source });
  }
  return getJson(`/api/owner/faces/${encodeURIComponent(faceId)}/card`, CardResponse);
}

// Mail pitches need a recipient e-mail; a Slack share takes an optional channel (empty = the workspace's default channel).
export const PitchRequest = z
  .object({ provider: z.enum(["gmail", "outlook", "slack"]), to: z.string().max(200).nullable(), note: z.string().max(2000).nullable() })
  .refine((p) => p.provider === "slack" || z.string().email().safeParse(p.to).success, { message: "A valid recipient e-mail is required.", path: ["to"] });
export type PitchInput = z.infer<typeof PitchRequest>;

/** POST /api/owner/faces/:id/pitch: mails the pitch sheet through a connected mail tool, or shares it in Slack. */
export async function sendPitch(faceId: string, input: PitchInput): Promise<PitchResult> {
  const body = PitchRequest.parse(input);
  if (isMock()) {
    await wait(600);
    return { ok: true, provider: body.provider, externalId: "sample-pitch-0001", url: null };
  }
  return getJson(`/api/owner/faces/${encodeURIComponent(faceId)}/pitch`, SendPlanResponse, { method: "POST", body: JSON.stringify(body) });
}

/** The pitch sheet as plain text: used for download, the mailto fallback and the mail body. */
export function pitchSheet(face: Face, card: AudienceCard, ownerName: string): string {
  const tags = card.topTags.map((t) => `- ${t.name}${t.lift ? ` (${t.lift}x vs Atlanta)` : ` (${t.score.toFixed(2)})`}`).join("\n");
  const brands = card.brands.map((b, i) => `${i + 1}. ${b.name} (${b.score.toFixed(2)})`).join("\n");
  return [
    `${face.id} · ${face.name} · ${face.neighbourhood}, Atlanta`,
    `${face.kind.replace("_", " ")} · ${face.heightFt}x${face.widthFt} ft · ${face.readSide}-hand read · ${face.lit ? "lit" : "unlit"}`,
    `Offered by ${ownerName}`,
    "",
    "Fans who live around this face love:",
    tags,
    "",
    "Brands whose fans over-index here:",
    brands,
    "",
    `Source: Qloo taste insights by location (aggregate, no personal data), generated ${card.generatedAt.slice(0, 10)}.`,
    face.location === "sample" ? "Sample face: position and specs are illustrative." : "Face position from OpenStreetMap.",
    "Sent from Wallspace (hackathon build).",
  ].join("\n");
}
