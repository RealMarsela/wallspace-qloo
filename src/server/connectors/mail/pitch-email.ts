import type { Face, MediaOwner } from "@/contract";
import type { AudienceCardBundle } from "../composio/pitch-source";

// Media-owner pitch sheet for one face: what the face is, who lives around it, which brands over-index.
// Aggregate taste by place only. Rates and faces are samples and say so.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const KIND: Record<string, string> = { bulletin: "Bulletin", poster: "Poster", digital_bulletin: "Digital bulletin", bus_shelter: "Bus shelter", kiosk: "Kiosk" };

export const pitchPlanId = (faceId: string) => `pitch-${faceId}`;
export const PRIVACY_LINE = "Aggregate taste by place, no device tracking.";

/** Owner name with one "(sample)" label: sample owner names may already carry it. */
export function ownerLabel(owner: Pick<MediaOwner, "name" | "sample"> | null | undefined): string {
  if (!owner) return "Media owner";
  const base = owner.name.replace(/\s*\(sample\)\s*$/i, "").trim();
  return owner.sample || base !== owner.name.trim() ? `${base} (sample)` : base;
}

// Scores arrive 0..1 or as an index; show a whole number either way.
const pts = (n: number) => String(Math.round(n <= 1 ? n * 100 : n));

export interface Pitch {
  subject: string;
  html: string;
  text: string;
}

export function buildPitch(face: Face, owner: MediaOwner | null, card: AudienceCardBundle["card"], faceUrl: string, note?: string | null): Pitch {
  const ownerName = ownerLabel(owner);
  const specs = `${KIND[face.kind] ?? face.kind} ${face.widthFt}×${face.heightFt} ft · reads ${face.readSide}${face.lit ? " · lit" : ""}${face.digital ? " · digital" : ""}`;
  const tags = card.topTags.slice(0, 6);
  const brands = card.brands.slice(0, 6);
  const subject = `Wallspace pitch: ${face.id} ${face.name}, ${face.neighbourhood} [WS:${pitchPlanId(face.id)}]`;

  const tagRows = tags.map((t) => `<tr><td style="padding:4px 0;font:14px Arial;color:#1c1d1f">${esc(t.name)}</td><td style="padding:4px 0;text-align:right;font:700 14px Menlo,monospace;color:#1c1d1f">${pts(t.score)}</td></tr>`).join("");
  const brandRows = brands.map((b) => `<tr><td style="padding:4px 0;font:14px Arial;color:#1c1d1f">${esc(b.name)}</td><td style="padding:4px 0;text-align:right;font:700 14px Menlo,monospace;color:#0b6b3a">${pts(b.score)}</td></tr>`).join("");
  const noteBlock = note ? `<p style="margin:0 0 20px;padding:12px 14px;border-left:4px solid #f08a1c;background:#f4f1ea;font:14px/1.5 Arial;color:#1c1d1f">${esc(note)}</p>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#e7e6e1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border-radius:6px;overflow:hidden">
<tr><td style="background:#1c1d1f;padding:20px 24px"><span style="font:800 22px Impact,'Arial Narrow',sans-serif;color:#fff;letter-spacing:1px;text-transform:uppercase">Wallspace</span><span style="float:right;font:12px Menlo,monospace;color:#f08a1c">${esc(face.id)}</span></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 4px;font:700 13px Arial;letter-spacing:1px;text-transform:uppercase;color:#6b6f73">Pitch from ${esc(ownerName)}</p>
<h1 style="margin:0 0 4px;font:800 26px/1.15 Impact,'Arial Narrow',sans-serif;text-transform:uppercase;color:#1c1d1f">${esc(face.name)}</h1>
<p style="margin:0 0 20px;font:14px/1.5 Arial;color:#4a4d50">${esc(face.neighbourhood)}, Atlanta &middot; ${esc(specs)} &middot; <strong style="font-family:Menlo,monospace">${usd(face.rateMonthUsd)}</strong> a month <em>(sample rate)</em></p>
${noteBlock}
<h2 style="margin:0 0 8px;font:700 13px Arial;letter-spacing:1px;text-transform:uppercase;color:#6b6f73">Who lives around this face</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tagRows}</table>
<h2 style="margin:24px 0 8px;font:700 13px Arial;letter-spacing:1px;text-transform:uppercase;color:#6b6f73">Brands that over-index here</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${brandRows}</table>
<p style="margin:28px 0 8px"><a href="${esc(faceUrl)}" style="display:inline-block;background:#f08a1c;color:#1c1d1f;text-decoration:none;font:800 15px Arial;padding:12px 20px;border-radius:4px">See this face on Wallspace</a></p>
<p style="margin:16px 0 0;font:13px/1.5 Arial;color:#4a4d50">Reply to this email to book a call, counter on rate, or ask a question. Your reply is matched to this pitch automatically.</p>
</td></tr>
<tr><td style="background:#f4f1ea;padding:14px 24px;font:12px/1.5 Arial;color:#6b6f73">${PRIVACY_LINE} Scores are Wallspace estimates from Qloo taste data. The face${face.location === "sample" ? " (a sample face)" : " position is real; its specs, rate and owner assignment are samples"}. Reference [WS:${esc(pitchPlanId(face.id))}].</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Wallspace pitch: ${face.id} ${face.name}, ${face.neighbourhood}`, `From ${ownerName}`, specs, `${usd(face.rateMonthUsd)} a month (sample rate)`, "",
    "Who lives around this face:", ...tags.map((t) => `  ${t.name}  ${pts(t.score)}`), "",
    "Brands that over-index here:", ...brands.map((b) => `  ${b.name}  ${pts(b.score)}`), "",
    `See this face: ${faceUrl}`, "Reply to book a call, counter on rate, or ask a question.", `${PRIVACY_LINE} Sample data. [WS:${pitchPlanId(face.id)}]`,
  ].join("\n");
  return { subject, html, text };
}
