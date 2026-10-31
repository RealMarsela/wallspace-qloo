import type { Brief, Face, HeatCell, Plan, RunStep, Seed } from "@/contract";
import type { Store } from "../db/types";

// Everything the plan pipeline needs from other lanes (B1: Qloo, scoring, store) is a port defined here.
// Adapters wrap B1's real modules; tests and the replay run use fakes.

// The part of a KV namespace the pipeline uses (B1's KvLike is assignable).
export interface KvMin {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Called<T> {
  data: T;
  cached: boolean;
  ms: number;
  tool: string; // "qloo.insights urn:heatmap"
  requestId?: string | null; // x-qloo-request-id when this was a live Qloo call, null for a KV copy of one
}

export interface VocabItem {
  id: string;
  name: string;
  kind: "tag" | "audience";
  type: string; // urn:tag:genre:..., urn:audience:...
}

export interface BlockTag {
  id: string;
  name: string;
  affinity: number; // 0..1 (Qloo's number when there is no city baseline; with one, a lift score 0..1, see qloo-adapter)
  lift?: number | null; // block vs Atlanta: 1 = same as the city, 3 = three times closer to "everyone here"
}

export interface TrendRow {
  name: string; // a tag name from the request
  rising: boolean; // Qloo trending / bias.trends says its affinity is rising
  delta: number | null;
}

export interface QlooPort {
  vocabulary(): Promise<Called<VocabItem[]>>; // /v2/tags + audiences, cached
  search(query: string): Promise<Called<Seed | null>>; // /search
  heatmap(seeds: Seed[]): Promise<Called<HeatCell[]>>; // urn:heatmap over Atlanta
  blockTags(face: Pick2<Face, "lat" | "lng" | "neighbourhood">, seeds: Seed[]): Promise<Called<BlockTag[]>>; // urn:tag + signal.location
  trending(tagNames: string[]): Promise<Called<TrendRow[]>>; // trending / bias.trends for those tags, cached
}

export type Pick2<T, K extends keyof T> = { [P in K]: T[P] };

export interface ScoredFace {
  face: Face;
  affinity: number; // 0..1 from the heatmap cell
  score: number;
  hasEvidence: boolean;
}

export interface ScoringPort {
  score(faces: Face[], heat: HeatCell[]): ScoredFace[]; // every face, best first
  split(candidates: ScoredFace[], brief: Pick2<Brief, "budgetUsd" | "flightWeeks">): { picks: ScoredFace[]; costs: Record<string, number>; split: Plan["split"]; spendUsd: number };
}

// B1's store (D1 in production). The pipeline writes plans and run heads; steps arrive through the StepSink.
export type PlanStore = Store;

// Where each finished RunStep goes: the store, then every browser watching the run room.
export type StepSink = (step: RunStep) => Promise<void>;
