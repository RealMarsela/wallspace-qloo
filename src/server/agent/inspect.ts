import { z } from "zod";
import type { Face, PhotoRead, RunStep } from "@/contract";
import { isModelUnavailable, type ChatMessage, type TokenFactory, type ToolDef } from "../models";
import { skippedStep } from "./outage";
import type { ScoredFace } from "./ports";
import { loadImageDataUrl, readSitePhoto } from "./vision";

type PhotoReadT = z.infer<typeof PhotoRead>;

const MAX_INSPECT = 4;
const PARTIAL_MIN_SHARE = 0.06;

const tools: ToolDef[] = [
  { type: "function", function: { name: "inspect_site_photo", description: "Read the site photo of one candidate face: sightline, clutter, how much of the frame the face fills.", parameters: { type: "object", properties: { faceId: { type: "string" } }, required: ["faceId"] } } },
];

const SYSTEM = `You are the Wallspace planner choosing which candidate faces deserve a site-photo check before money is committed.
Faces with a photo on file can be inspected with inspect_site_photo. Inspect the strongest candidates first and the ones whose surroundings look risky (dense neighbourhood, tree cover). At most four inspections. Reply DONE after calling the tools.`;

export interface InspectResult {
  reads: Record<string, PhotoReadT>;
  dropped: { faceId: string; reason: string }[];
  steps: RunStep[];
  fixedSpine: boolean;
  unchecked: string[]; // faces with a photo that the vision model could not read (model unavailable): kept, shown as "photo not checked"
}

export async function inspectCandidates(tf: TokenFactory, candidates: ScoredFace[], fetchImpl?: typeof fetch): Promise<InspectResult> {
  const withPhoto = candidates.filter((c) => c.face.photoUrl);
  const steps: RunStep[] = [];
  const reads: Record<string, PhotoReadT> = {};
  const dropped: InspectResult["dropped"] = [];
  if (!withPhoto.length) {
    steps.push({ id: "", at: new Date().toISOString(), role: "super-vl", model: null, title: "read site photos", tool: "inspect_site_photo", summary: "no candidate has a site photo on file; the read is skipped", ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "skipped" });
    return { reads, dropped, steps, fixedSpine: false, unchecked: [] };
  }

  let chosen: string[] = [];
  let fixedSpine = false;
  try {
    const list = candidates.map((c) => `${c.face.id} ${c.face.name} (${c.face.neighbourhood}) affinity ${c.affinity.toFixed(2)} photo:${c.face.photoUrl ? "yes" : "no"}`).join("\n");
    const messages: ChatMessage[] = [{ role: "system", content: SYSTEM }, { role: "user", content: `Candidates:\n${list}` }];
    const res = await tf.chat({ role: "superVl", messages, tools, toolChoice: "auto", reasoning: "off", maxTokens: 400, temperature: 0, meta: { title: "choose which site photos to read", tool: "tool calling" } });
    const ids = res.toolCalls.flatMap((c) => {
      try {
        const a = z.object({ faceId: z.string() }).parse(JSON.parse(c.function.arguments));
        return c.function.name === "inspect_site_photo" ? [a.faceId] : [];
      } catch {
        return [];
      }
    });
    chosen = ids.filter((id) => withPhoto.some((c) => c.face.id === id)).slice(0, MAX_INSPECT);
    steps.push({ ...res.step, summary: chosen.length ? `chose to inspect ${chosen.join(", ")}` : "no valid inspection chosen" });
  } catch (e) {
    if (isModelUnavailable(e)) {
      // The vision model is gone, so no photo can be read: every face with a photo is kept and marked unchecked.
      const unchecked = withPhoto.map((c) => c.face.id);
      steps.push(skippedStep("superVl", e, "read site photos", "inspect_site_photo", `Photo read skipped for ${unchecked.length} face(s); they are kept with "photo not checked".`));
      return { reads, dropped, steps, fixedSpine: false, unchecked };
    }
    // any other failure falls through to the fixed spine
  }
  if (!chosen.length) {
    fixedSpine = true;
    chosen = withPhoto.slice(0, 3).map((c) => c.face.id);
    steps.push({ id: "", at: new Date().toISOString(), role: "super-vl", model: null, title: "fixed spine", tool: "fixed spine", summary: `planner chose no inspection; the fixed spine reads the top ${chosen.length} photos`, ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "ok" });
  }

  const byId = new Map(candidates.map((c) => [c.face.id, c.face] as const));
  const unchecked: string[] = [];
  for (const [at, id] of chosen.entries()) {
    const face = byId.get(id) as Face;
    try {
      const url = await loadImageDataUrl(face.photoUrl as string, fetchImpl).catch(async () => {
        await new Promise((r) => setTimeout(r, 600));
        return loadImageDataUrl(face.photoUrl as string, fetchImpl);
      });
      const r = await readSitePhoto(tf, face, url);
      reads[id] = r.read;
      // A face is dropped when its sightline is blocked, or partly hidden and so small in frame that it cannot be read from the road.
      const small = r.read.sightline === "partial" && r.read.faceShareOfFrame < PARTIAL_MIN_SHARE;
      const blocked = r.read.sightline === "blocked" || small;
      steps.push(...r.steps.map((s) => ({ ...s, summary: `${face.id}: ${r.read.sightline} sightline, ${r.read.clutter} clutter, face fills ${Math.round(r.read.faceShareOfFrame * 100)}%. ${r.read.note}${blocked ? (small ? ` Dropped: partly hidden and fills only ${Math.round(r.read.faceShareOfFrame * 100)}% of the frame.` : " Dropped: sightline blocked.") : ""}` })));
      if (blocked) dropped.push({ faceId: id, reason: r.read.note });
    } catch (e) {
      if (isModelUnavailable(e)) {
        // Same model for every read: stop here, keep this face and the unread ones as "photo not checked".
        unchecked.push(...chosen.slice(at));
        steps.push(skippedStep("superVl", e, `read the site photo of ${id}`, "vision: site photo", `${unchecked.length} face(s) kept with "photo not checked".`));
        break;
      }
      steps.push({ id: "", at: new Date().toISOString(), role: "super-vl", model: null, title: `read the site photo of ${id}`, tool: "vision: site photo", summary: `photo could not be read (${e instanceof Error ? e.message : "error"}); face kept without a photo read`, ms: 0, tokensIn: null, tokensOut: null, costUsd: 0, requestId: null, cached: false, status: "error" });
    }
  }
  return { reads, dropped, steps, fixedSpine, unchecked };
}
