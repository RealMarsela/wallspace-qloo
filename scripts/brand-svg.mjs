// Writes the Wallspace logo (Gemini concept A4, chosen 30 Oct) as clean SVGs into public/brand.
// Geometry is measured from the Gemini render; the wordmark is Host Grotesk 400 with cap height = frame height.
import { mkdirSync, writeFileSync } from "node:fs";

const INK = "#22211D", PAPER = "#FBFAF7", GREEN = "#3FD6A0";
const W = 96, FH = 55, SW = 5.5, PW = 11, PH = 17; // frame width/height, stroke, post width/height
const BAND = [15.6, 39.8], PERIOD = 14.2, BAR = 5.7, SLANT = 7.4;

function mark(frame, band, id) {
  const r = SW / 2, inner = { x: SW, y: SW, w: W - 2 * SW, h: FH - 2 * SW };
  let bars = "";
  for (let x = inner.x - SLANT; x < inner.x + inner.w + PERIOD; x += PERIOD) {
    const t = BAND[0] - 0.4, b = BAND[1] + 0.4;
    bars += `<path d="M${(x + SLANT).toFixed(2)} ${t}H${(x + SLANT + BAR).toFixed(2)}L${(x + BAR).toFixed(2)} ${b}H${x.toFixed(2)}Z"/>`;
  }
  return `<defs><clipPath id="${id}"><rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="2.9"/></clipPath></defs>
<rect x="${(W - PW) / 2}" y="${FH - 1}" width="${PW}" height="${PH + 1}" fill="${frame}"/>
<rect x="${r}" y="${r}" width="${W - SW}" height="${FH - SW}" rx="5.65" fill="${GREEN}" stroke="${frame}" stroke-width="${SW}"/>
<g clip-path="url(#${id})"><rect x="0" y="${BAND[0]}" width="${W}" height="${BAND[1] - BAND[0]}" fill="${band}"/><g fill="${GREEN}">${bars}</g></g>`;
}

const H = FH + PH; // 72
const variants = {
  light: { frame: INK, band: PAPER, text: INK },
  dark: { frame: PAPER, band: INK, text: PAPER },
};
const out = new URL("../public/brand/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const [name, v] of Object.entries(variants)) {
  // Icon: square, mark centred. Transparent background so it sits on any surface of its theme.
  writeFileSync(new URL(`wallspace-icon-${name}.svg`, out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -24 120 120" width="120" height="120" role="img" aria-label="Wallspace">${mark(v.frame, v.band, `f-${name}-i`)}</svg>\n`);
  // Lockup: mark + wordmark; cap height (0.7em in Host Grotesk) equals the frame height.
  const size = (FH / 0.7).toFixed(1), tx = W + 34;
  writeFileSync(new URL(`wallspace-lockup-${name}.svg`, out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 ${H}" width="520" height="${H}" role="img" aria-label="Wallspace">${mark(v.frame, v.band, `f-${name}-l`)}
<text x="${tx}" y="${FH}" font-family="'Host Grotesk', ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="${size}" letter-spacing="-1.6" fill="${v.text}">Wallspace</text></svg>\n`);
}
