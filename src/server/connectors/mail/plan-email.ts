import type { PlanBundle } from "../composio/registry";

// Branded plan email: concrete ground, interstate green for picked faces, sodium orange for the plan id.
// Table layout with inline styles so it survives Gmail and Outlook. Rates and faces are sample data and say so.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const KIND: Record<string, string> = { bulletin: "Bulletin", poster: "Poster", digital_bulletin: "Digital bulletin", bus_shelter: "Bus shelter", kiosk: "Kiosk" };

export const planToken = (planId: string) => `[WS:${planId}]`;
export const TOKEN_RE = /\[WS:([A-Za-z0-9_-]+)\]/;

export function flightLabel(start: string, weeks: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return `${weeks} weeks`;
  return `${d.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}, ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export interface PlanEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildPlanEmail(b: PlanBundle, planUrl: string, note?: string | null, openOohLink?: string | null): PlanEmail {
  const { plan, brief, faces } = b;
  const byId = new Map(faces.map((f) => [f.id, f]));
  const brand = brief.brandSample ? `${brief.brandName} (sample brand)` : brief.brandName;
  const flight = flightLabel(brief.flightStart, brief.flightWeeks);
  const picks = [...plan.picks].sort((a, c) => a.rank - c.rank);
  const subject = `Wallspace plan for ${brand}: ${picks.length} faces, ${usd(plan.spendUsd)} ${planToken(plan.id)}`;

  const rows = picks.map((p) => {
    const f = byId.get(p.faceId);
    const line = p.copy[p.chosenCopy]?.text ?? p.copy[0]?.text ?? "";
    const where = f ? `${esc(f.name)}<br><span style="color:#6b6f73">${esc(f.neighbourhood)} &middot; ${KIND[f.kind] ?? f.kind} ${f.widthFt}&times;${f.heightFt} ft &middot; reads ${f.readSide}${f.lit ? " &middot; lit" : ""}</span>` : "";
    return `<tr>
      <td style="padding:12px 10px;border-top:1px solid #d5d5d0;vertical-align:top"><span style="font:700 13px/1 Menlo,monospace;background:#0b6b3a;color:#fff;padding:3px 6px;border-radius:3px">${esc(p.faceId)}</span></td>
      <td style="padding:12px 10px;border-top:1px solid #d5d5d0;vertical-align:top;font:14px/1.4 Arial,sans-serif;color:#1c1d1f">${where}</td>
      <td style="padding:12px 10px;border-top:1px solid #d5d5d0;vertical-align:top"><div style="background:#14532d;color:#fff;font:800 15px/1.2 Impact,'Arial Narrow',sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:8px 10px;border-radius:3px">${esc(line)}</div></td>
      <td style="padding:12px 10px;border-top:1px solid #d5d5d0;vertical-align:top;text-align:right;font:700 14px/1.4 Menlo,monospace;color:#1c1d1f">${usd(p.costUsd)}<div style="font:11px Arial;color:#6b6f73">sample rate</div></td>
    </tr>`;
  }).join("");

  const split = plan.split.map((s) => `<tr><td style="padding:4px 0;font:14px Arial;color:#1c1d1f">${esc(s.neighbourhood)}</td><td style="padding:4px 0;text-align:right;font:700 14px Menlo,monospace;color:#1c1d1f">${usd(s.usd)} <span style="color:#6b6f73;font-weight:400">${Math.round(s.share * 100)}%</span></td></tr>`).join("");
  const noteBlock = note ? `<p style="margin:0 0 20px;padding:12px 14px;border-left:4px solid #f08a1c;background:#f4f1ea;font:14px/1.5 Arial;color:#1c1d1f">${esc(note)}</p>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#e7e6e1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border-radius:6px;overflow:hidden">
<tr><td style="background:#1c1d1f;padding:20px 24px"><span style="font:800 22px Impact,'Arial Narrow',sans-serif;color:#fff;letter-spacing:1px;text-transform:uppercase">Wallspace</span><span style="float:right;font:12px Menlo,monospace;color:#f08a1c">${esc(plan.id)}</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 4px;font:800 26px/1.15 Impact,'Arial Narrow',sans-serif;text-transform:uppercase;color:#1c1d1f">${picks.length} faces for ${esc(brand)}</h1>
<p style="margin:0 0 20px;font:14px/1.5 Arial;color:#4a4d50">Flight ${esc(flight)} &middot; ${usd(plan.spendUsd)} total &middot; Atlanta</p>
${noteBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<h2 style="margin:24px 0 8px;font:700 13px Arial;letter-spacing:1px;text-transform:uppercase;color:#6b6f73">Budget split by neighbourhood</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${split}</table>
<p style="margin:28px 0 8px"><a href="${esc(planUrl)}" style="display:inline-block;background:#f08a1c;color:#1c1d1f;text-decoration:none;font:800 15px Arial;padding:12px 20px;border-radius:4px">Open the plan</a></p>
${openOohLink ? `<p style="margin:0 0 8px;font:13px/1.5 Arial;color:#4a4d50"><a href="${esc(openOohLink)}" style="color:#0b6b3a;font-weight:700">OpenOOH deal request (JSON)</a> &middot; venue-tagged, OpenRTB-shaped, ready for a DSP that accepts it. Not submitted to any exchange.</p>` : ""}<p style="margin:16px 0 0;font:13px/1.5 Arial;color:#4a4d50">Reply to this email to confirm, counter on rate, or tell us a face is unavailable. Your reply is matched to this plan automatically.</p>
</td></tr>
<tr><td style="background:#f4f1ea;padding:14px 24px;font:12px/1.5 Arial;color:#6b6f73">Sample data: the brand, faces and rates in this plan are labelled samples from a hackathon build. No payment is requested. Plan reference ${esc(planToken(plan.id))}.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Wallspace plan for ${brand}`, `Flight ${flight}, ${usd(plan.spendUsd)} total`, "",
    ...picks.map((p) => {
      const f = byId.get(p.faceId);
      return `${p.faceId}  ${f?.name ?? ""} (${f?.neighbourhood ?? ""})  "${p.copy[p.chosenCopy]?.text ?? ""}"  ${usd(p.costUsd)} sample rate`;
    }),
    "", `Open the plan: ${planUrl}`, ...(openOohLink ? [`OpenOOH deal request (JSON, not submitted to any exchange): ${openOohLink}`] : []), "Reply to confirm, counter on rate, or flag an unavailable face.", `Sample data. ${planToken(plan.id)}`,
  ].join("\n");

  return { subject, html, text };
}
