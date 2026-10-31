import { z } from "zod";
import type { Brief, Face, Plan, RunStep } from "@/contract";
import { chatJson, type TokenFactory } from "../models";

// Ultra reads the whole plan once: clashing or repeated copy on nearby faces, a budget that does not add up, lines off the brand.
const SYSTEM = `You are the senior reviewer of an outdoor advertising plan. Check three things only:
1) clash: nearby faces (listed with distances) carry the same or near-identical copy, or copy that competes;
2) budget: the sum of face costs matches the stated spend and stays within the brief budget; no neighbourhood takes over 30% of the plan spend;
3) brand: a chosen line is off the brand voice or reads as targeting people by identity.
Flag only real problems. Reply as JSON {"flags":[{"faceId":string,"issue":"clash"|"repeat"|"budget"|"off-brand","note":string}],"budgetOk":boolean,"budgetNote":string}.`;

const Out = z.object({
  flags: z.array(z.object({ faceId: z.string(), issue: z.enum(["clash", "repeat", "budget", "off-brand"]), note: z.string().max(300) })).max(12),
  budgetOk: z.boolean(),
  budgetNote: z.string().max(300),
});
export type ReviewOutput = z.infer<typeof Out>;

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function ultraReview(tf: TokenFactory, brief: Pick<Brief, "brandName" | "brandVoice" | "budgetUsd">, plan: Pick<Plan, "picks" | "spendUsd" | "split">, faces: Face[]): Promise<{ out: ReviewOutput; steps: RunStep[] }> {
  const byId = new Map(faces.map((f) => [f.id, f] as const));
  const rows = plan.picks.map((p) => {
    const f = byId.get(p.faceId);
    return `${p.faceId} | ${f?.neighbourhood ?? "?"} | $${p.costUsd} | "${p.copy[p.chosenCopy]?.text ?? ""}"`;
  });
  const pairs: string[] = [];
  for (let i = 0; i < plan.picks.length; i++) {
    for (let j = i + 1; j < plan.picks.length; j++) {
      const a = byId.get(plan.picks[i].faceId);
      const b = byId.get(plan.picks[j].faceId);
      if (a && b && haversineM(a, b) <= 1500) pairs.push(`${a.id} and ${b.id}: ${Math.round(haversineM(a, b))} m apart`);
    }
  }
  const user = [
    `Brand: ${brief.brandName}. Voice: ${brief.brandVoice ?? "warm, dry, a little cheeky"}. Brief budget $${brief.budgetUsd}. Plan spend $${plan.spendUsd}.`,
    `Neighbourhood split: ${plan.split.map((s) => `${s.neighbourhood} $${s.usd} (${Math.round(s.share * 100)}%)`).join(", ")}.`,
    `Faces (id | neighbourhood | cost | chosen line):\n${rows.join("\n")}`,
    `Nearby pairs within 1.5 km:\n${pairs.join("\n") || "none"}`,
  ].join("\n\n");
  const r = await chatJson(tf, { role: "ultra", reasoning: "default", temperature: 0, maxTokens: 7000, meta: { title: "review the whole plan", tool: "review" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }, Out, { reasoning: "off", maxTokens: 1200 });
  return { out: r.value, steps: r.steps };
}
