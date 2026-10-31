import { z } from "zod";

// Qloo Taste AI, hackathon base https://hackathon.api.qloo.com, header X-Api-Key, server-side only.
// Response schemas are deliberately tolerant (passthrough, optional fields): they are written from the public docs and the
// shared probe's SHAPES.md. `normalize*` functions turn them into the small types the app uses.

export const QLOO_BASE = "https://hackathon.api.qloo.com";
export type QlooMode = "live"; // the only mode: every answer is a live Qloo call or a KV copy of one

/** Kinds of request the app makes. */
export type QlooKind =
  | "search" | "entities" | "audiences" | "tags" | "heatmap" | "tags-by-place" | "city-tags" | "brands-by-place" | "demographics" | "explain";

export type QlooParams = Record<string, string | number | boolean | undefined>;

export class QlooError extends Error {
  constructor(message: string, readonly code: "no_key" | "cap_reached" | "http" | "bad_request" | "network" | "shape", readonly status?: number) {
    super(message);
    this.name = "QlooError";
  }
}

const n = z.number().nullish();
export const Affinity = z.object({ affinity: n, affinity_rank: n, popularity: n }).passthrough();

// Observed 30 Oct 2026: /search and /entities answer { results: [ entity ] } (a bare array, no `success`); rows carry `types[]`.
export const SearchResp = z.object({
  results: z.array(z.object({
    entity_id: z.string(), name: z.string(), types: z.array(z.string()).optional(), popularity: n,
    disambiguation: z.string().nullish(),
  }).passthrough()),
}).passthrough();

/** HTTP 400 body: { errors: [ { message, path? } ] }, no `success`. */
export const ErrorResp = z.object({ errors: z.array(z.object({ message: z.string(), path: z.string().optional() }).passthrough()) }).passthrough();

// Insights rows: entity_id, subtype "urn:entity:<kind>", tags[] use `id`; /entities rows use `types[]` instead of `subtype`.
const Entity = z.object({
  entity_id: z.string(), name: z.string(),
  types: z.array(z.string()).optional(), subtype: z.string().nullish(), popularity: n,
  tags: z.array(z.object({ id: z.string().optional(), tag_id: z.string().optional(), name: z.string().optional(), type: z.string().optional() }).passthrough()).optional(),
  query: z.object({
    affinity: n, distance: n, popularity: n, measurements: z.object({ audience_growth: n }).passthrough().optional(),
    // feature.explainability: ids and scores only, keyed by signal type; names come from the caller's anchor list.
    explainability: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
}).passthrough();
export const EntitiesResp = z.object({ results: z.object({ entities: z.array(Entity) }).passthrough().or(z.array(Entity)) }).passthrough();

// Two tag shapes. Tag INSIGHTS rows: tag_id, subtype (the namespace), types (parent entity types), query.affinity.
// /v2/tags LIST rows: id, type (the namespace), popularity, parents[], properties. Same field, different names.
const Tag = z.object({
  tag_id: z.string().optional(), id: z.string().optional(), name: z.string(),
  types: z.array(z.string()).optional(), subtype: z.string().nullish(), type: z.string().nullish(), popularity: n, query: Affinity.optional(),
}).passthrough();
export const TagsResp = z.object({ results: z.object({ tags: z.array(Tag) }).passthrough().or(z.array(Tag)) }).passthrough();

export const HeatmapResp = z.object({
  results: z.object({
    heatmap: z.array(z.object({
      // 7-character geohash plus its centre; `query` also carries affinity_rank, popularity, entity_brand_affinity(_rank).
      location: z.object({ latitude: z.number().optional(), longitude: z.number().optional(), geohash: z.string() }).passthrough(),
      query: Affinity,
    }).passthrough()),
  }).passthrough(),
}).passthrough();

export const AudiencesResp = z.object({
  results: z.object({
    audiences: z.array(z.object({
      id: z.string().optional(), audience_id: z.string().optional(), entity_id: z.string().optional(), name: z.string(),
      parents: z.array(z.unknown()).optional(), types: z.array(z.string()).optional(),
    }).passthrough()),
  }).passthrough(),
}).passthrough();

export const DemographicsResp = z.object({
  results: z.object({ demographics: z.array(z.object({ entity_id: z.string().optional(), query: z.record(z.string(), z.unknown()).optional() }).passthrough()) }).passthrough(),
}).passthrough();

// ---- what the app uses
export interface QlooHit { id: string; name: string; types: string[]; popularity: number | null }
export interface QlooTag { id: string; name: string; type: string | null; affinity: number | null; popularity: number | null }
export interface QlooBrand { id: string; name: string; affinity: number | null; popularity: number | null; audienceGrowth: number | null }
export interface QlooAudience { id: string; name: string; type: string | null }
export type DemographicBucket = Record<string, number>; // "age:25_to_29" -> 0.31, "gender:female" -> 0.12 (affinity, -1..1)
