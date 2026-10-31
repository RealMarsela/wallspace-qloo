import type { z } from "zod";
import type { ModelRole } from "@/contract";

export type Role = z.infer<typeof ModelRole>;

export interface RoleInfo {
  label: string; // short chip label, phones only (the full name stays in the accessible name)
  name: string; // the full name, shown wherever a model is named
  maker: string;
  does: string; // plain-language job in Wallspace
  swatch: string; // CSS color for the chip key
}

// One plain-language card per role. Used by chips, the run panel and the run trace legend.
export const roles: Record<Role, RoleInfo> = {
  "super-vl": {
    label: "Super VL",
    name: "Nemotron 3.5 Super VL",
    maker: "NVIDIA · on Nebius Token Factory",
    does: "The planner. Decides which tool to call next, scores faces, splits the budget, and looks at each site photo for sightline and clutter.",
    swatch: "#4f7fd9",
  },
  lightning: {
    label: "Lightning",
    name: "Nemotron 3.5 Lightning",
    maker: "NVIDIA · on Nebius Token Factory",
    does: "The fast writer. Drafts three billboard lines per face from what that block loves, and sorts event search results.",
    swatch: "#d9a300",
  },
  ultra: {
    label: "Ultra",
    name: "Nemotron 3 Ultra 550B",
    maker: "NVIDIA · on Nebius Token Factory",
    does: "The reviewer. One pass over the finished plan: clashing copy, budget sense, brand fit. It can send a line back.",
    swatch: "#8b8e96",
  },
  embedding: {
    label: "Qwen3 Embed",
    name: "Qwen3 Embedding 8B",
    maker: "Qwen (not NVIDIA) · on Nebius Token Factory",
    does: "Turns the planner's free-text audience into the closest Qloo taste tags by meaning.",
    swatch: "#2fa39a",
  },
  "live-guard": {
    label: "Live guard",
    name: "Taste-only guard",
    maker: "Wallspace code applying the NeMo Guardrails policy",
    does: "Checks every brief and every line as you go: plan by taste, never by race, religion, age or other identity.",
    swatch: "#c9473d",
  },
  nemo: {
    label: "NeMo",
    name: "NeMo Guardrails",
    maker: "NVIDIA · batch job on Nebius Serverless",
    does: "Re-checks every signed-off line before print, as a job started on demand. Results come back to the plan.",
    swatch: "#7a1f19",
  },
  tavily: {
    label: "Tavily",
    name: "Tavily",
    maker: "Tavily search · web search API",
    does: "Finds events near each face during the flight dates. Results are cached by neighbourhood and month.",
    swatch: "#8a5cc4",
  },
  qloo: {
    label: "Qloo",
    name: "Qloo",
    maker: "Qloo Taste AI · cultural taste data",
    does: "Where the audience lives (the heatmap) and what each block over-indexes on. Taste by place, no device tracking.",
    swatch: "#ee7410",
  },
};

export const roleOrder: Role[] = ["super-vl", "lightning", "ultra", "embedding", "qloo", "tavily", "live-guard", "nemo"];
