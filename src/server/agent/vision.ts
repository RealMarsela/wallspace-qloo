import { z } from "zod";
import type { Face, RunStep } from "@/contract";
import { PhotoRead } from "@/contract";
import { chatJson, type TokenFactory } from "../models";

type PhotoReadT = z.infer<typeof PhotoRead>;

const MAX_BYTES = 4_000_000;
const UA = "WallspaceBuild/0.1 (hackathon demo; https://wallspace.pages.dev)";

// Wikimedia file pages become a width-limited thumbnail URL; everything else is fetched as given.
export function imageFetchUrl(url: string): string {
  const m = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:(.+)$/.exec(url);
  return m ? `https://commons.wikimedia.org/wiki/Special:FilePath/${m[1]}?width=1024` : url;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function loadImageDataUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (url.startsWith("data:image/")) return url;
  const res = await fetchImpl(imageFetchUrl(url), { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`photo fetch ${res.status}`);
  const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
  if (!type.startsWith("image/")) throw new Error("photo is not an image");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("photo too large");
  return `data:${type};base64,${toBase64(buf)}`;
}

const Out = z.object({
  sightline: PhotoRead.shape.sightline,
  clutter: PhotoRead.shape.clutter,
  faceShareOfFrame: z.number().min(0).max(1),
  note: z.string().max(200),
});

const SYSTEM = `You read one site photo of an outdoor advertising face (bulletin, poster, shelter or kiosk) for a media planner.
Judge only what is visible. Reply as JSON {"sightline":"clear"|"partial"|"blocked","clutter":"low"|"medium"|"high","faceShareOfFrame":number 0-1,"note":string}.
sightline: can a driver or pedestrian approaching see the whole face? "blocked" = trees, buildings, poles or vehicles hide most of it; "partial" = some of it is hidden.
clutter: competing signs, wires and visual noise around the face. faceShareOfFrame: fraction of the photo the face fills. note: one plain sentence, under 25 words, naming what blocks or helps the view.`;

export async function readSitePhoto(tf: TokenFactory, face: Face, dataUrl: string): Promise<{ read: PhotoReadT; steps: RunStep[] }> {
  const r = await chatJson(tf, {
    role: "superVl",
    reasoning: "off",
    temperature: 0,
    maxTokens: 300,
    meta: { title: `read the site photo of ${face.id}`, tool: "vision: site photo", summary: face.name },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: [{ type: "text", text: `Face ${face.id}, ${face.kind}, ${face.widthFt} x ${face.heightFt} ft, ${face.neighbourhood}.` }, { type: "image_url", image_url: { url: dataUrl } }] },
    ],
  }, Out);
  return { read: r.value, steps: r.steps };
}
