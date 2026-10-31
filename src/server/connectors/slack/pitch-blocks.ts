import type { Face, MediaOwner } from "@/contract";
import { PRIVACY_LINE, ownerLabel } from "../mail/pitch-email";
import type { AudienceCardBundle } from "../composio/pitch-source";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pts = (n: number) => String(Math.round(n <= 1 ? n * 100 : n));

export const pitchText = (f: Face) => `Pitch sheet: ${f.id} ${f.name}, ${f.neighbourhood}`;

// Internal share of a pitch sheet: no approval buttons, one link button.
export function pitchBlocks(face: Face, owner: MediaOwner | null, card: AudienceCardBundle["card"], faceUrl: string, note?: string | null): Record<string, unknown>[] {
  const tags = card.topTags.slice(0, 5).map((t) => `${t.name} ${pts(t.score)}`).join("  ·  ");
  const brands = card.brands.slice(0, 5).map((b) => `${b.name} ${pts(b.score)}`).join("  ·  ");
  const blocks: Record<string, unknown>[] = [
    { type: "header", text: { type: "plain_text", text: pitchText(face).slice(0, 150) } },
    { type: "section", text: { type: "mrkdwn", text: `*${ownerLabel(owner)}*  ·  ${face.widthFt}×${face.heightFt} ft${face.lit ? ", lit" : ""}  ·  ${usd(face.rateMonthUsd)} a month (sample rate)` } },
    { type: "section", text: { type: "mrkdwn", text: `*Who lives around it*\n${tags}\n*Brands that over-index*\n${brands}` } },
  ];
  if (note) blocks.splice(1, 0, { type: "section", text: { type: "mrkdwn", text: note.slice(0, 1500) } });
  blocks.push(
    { type: "actions", elements: [{ type: "button", action_id: "wallspace_open", text: { type: "plain_text", text: "Open face" }, url: faceUrl }] },
    { type: "context", elements: [{ type: "mrkdwn", text: `${PRIVACY_LINE} Sample face, rate and owner labels.` }] },
  );
  return blocks;
}
