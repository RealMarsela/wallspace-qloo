import type { Store } from "../db/types";
import type { TokenFactory } from "../models";
import { writeCopy } from "./copy";
import type { Redraft } from "./signoff";

// After NeMo blocks a line, Lightning redrafts that face's lines once; the live guard re-checks them.
export function redraftFor(store: Store, tf: TokenFactory): Redraft {
  return async (planId, faceId, reasons) => {
    const plan = await store.getPlan(planId);
    const brief = plan ? await store.getBrief(plan.briefId) : null;
    const pick = plan?.picks.find((p) => p.faceId === faceId);
    if (!plan || !brief || !pick) return null;
    const { faces } = await import("@/data/faces");
    const face = faces.find((f) => f.id === faceId);
    if (!face) return null;
    const r = await writeCopy(tf, { brief, face, topTags: pick.topTags, events: pick.events, redraftNote: `NeMo Guardrails blocked a line: ${reasons.join(" ")}` });
    return r.needsHuman ? null : r.lines; // a redraft that fails the complete-phrase check leaves the current lines
  };
}
