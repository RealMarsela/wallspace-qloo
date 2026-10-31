import type { HeatCell } from "@/contract";
import type { QlooClient, QlooResult } from "./client";
import { decodeGeohash } from "./geohash";
import {
  AudiencesResp, DemographicsResp, EntitiesResp, HeatmapResp, SearchResp, TagsResp,
  type DemographicBucket, type QlooAudience, type QlooBrand, type QlooHit, type QlooTag,
} from "./types";

// One function per Qloo endpoint the app uses. Parameter names follow docs.qloo.com and the shapes observed on 30 Oct 2026
// (qloo-probe/SHAPES.md). Longitude comes first in WKT. Insights lists take at most 50 rows (take=100 is a 400); /v2/tags lists allow more.

/** City of Atlanta bounding polygon for city-wide heatmaps (WKT, lng lat). */
export const ATLANTA_WKT = "POLYGON((-84.55 33.65,-84.29 33.65,-84.29 33.89,-84.55 33.89,-84.55 33.65))";
export const point = (lat: number, lng: number) => `POINT(${lng} ${lat})`;
const idOf = (v: { id?: string; entity_id?: string; tag_id?: string }) => v.entity_id ?? v.tag_id ?? v.id ?? "";
const clamp01 = (n: number | null | undefined) => (typeof n === "number" ? Math.max(0, Math.min(1, n)) : 0);
const rows = <T>(r: T[] | { entities?: T[]; tags?: T[] }): T[] => (Array.isArray(r) ? r : (r.entities ?? r.tags ?? []));

const wrap = <T, U>(r: QlooResult<T>, f: (d: T) => U): QlooResult<U> => ({ data: f(r.data), source: r.source });

type EntityRow = { entity_id: string; name: string; query?: { affinity?: number | null; popularity?: number | null; measurements?: { audience_growth?: number | null } } | null; popularity?: number | null };
const brandOf = (e: EntityRow): QlooBrand => ({ id: e.entity_id, name: e.name, affinity: e.query?.affinity ?? null, popularity: e.popularity ?? e.query?.popularity ?? null, audienceGrowth: e.query?.measurements?.audience_growth ?? null });
type TagRow = { tag_id?: string; id?: string; name: string; subtype?: string | null; type?: string | null; popularity?: number | null; query?: { affinity?: number | null } | null };
// Insights rows name the namespace `subtype`; /v2/tags list rows name it `type`. `types[]` on insights rows is the parent entity types.
const tagOf = (t: TagRow): QlooTag => ({ id: idOf(t), name: t.name, type: t.subtype ?? t.type ?? null, affinity: t.query?.affinity ?? null, popularity: t.popularity ?? null });

/** Name lookup (not id lookup). `types` is a comma list of urn:entity kinds; without it, places and localities crowd out media. */
export async function search(c: QlooClient, query: string, opts: { types?: string; take?: number } = {}): Promise<QlooResult<QlooHit[]>> {
  const r = await c.call("search", "/search", { query, types: opts.types, take: opts.take ?? 5 }, SearchResp);
  return wrap(r, (d) => d.results.map((x) => ({ id: x.entity_id, name: x.name, types: x.types ?? [], popularity: x.popularity ?? null })));
}

export async function entities(c: QlooClient, ids: string[]): Promise<QlooResult<QlooBrand[]>> {
  const r = await c.call("entities", "/entities", { entity_ids: ids.join(",") }, EntitiesResp);
  return wrap(r, (d) => rows(d.results).map(brandOf));
}

/** Unverified shape: the probe only saw the 400 that lists the accepted filters. The vocabulary does not use it. */
export async function audiences(c: QlooClient, type?: string, take = 50): Promise<QlooResult<QlooAudience[]>> {
  const r = await c.call("audiences", "/v2/audiences", { "filter.parents.types": type, take }, AudiencesResp);
  return wrap(r, (d) => d.results.audiences.map((a) => ({ id: a.audience_id ?? a.entity_id ?? a.id ?? "", name: a.name, type: a.types?.[0] ?? null })));
}

/** /v2/tags list: free-text lookup (filter.query) or one namespace (filter.tag.types). Rows use `id` and `type`. */
export async function tags(c: QlooClient, opts: { query?: string; types?: string; take?: number } = {}): Promise<QlooResult<QlooTag[]>> {
  const r = await c.call("tags", "/v2/tags", { "filter.query": opts.query, "filter.tag.types": opts.types, take: opts.take ?? 20 }, TagsResp);
  return wrap(r, (d) => rows(d.results).map(tagOf));
}

/** Where a taste concentrates: 7-character geohash cells with affinity 0..1. `take` is ignored by Qloo here, so it is not sent. */
export async function heatmap(c: QlooClient, o: { entityIds?: string[]; tagIds?: string[]; wkt?: string }): Promise<QlooResult<HeatCell[]>> {
  const r = await c.call("heatmap", "/v2/insights", {
    "filter.type": "urn:heatmap", "filter.location": o.wkt ?? ATLANTA_WKT,
    "signal.interests.entities": o.entityIds?.join(","), "signal.interests.tags": o.tagIds?.join(","),
  }, HeatmapResp);
  return wrap(r, (d) => d.results.heatmap.map((h) => {
    const g = h.location.latitude !== undefined && h.location.longitude !== undefined ? { lat: h.location.latitude, lng: h.location.longitude } : decodeGeohash(h.location.geohash);
    return { geohash: h.location.geohash, lat: g.lat, lng: g.lng, affinity: clamp01(h.query.affinity) };
  }));
}

/** What the block around a point over-indexes on (tag insights with a location signal; mixed namespaces unless `tagTypes`). */
export async function tagsByPlace(c: QlooClient, lat: number, lng: number, o: { radiusM?: number; tagTypes?: string; take?: number } = {}): Promise<QlooResult<QlooTag[]>> {
  const r = await c.call("tags-by-place", "/v2/insights", {
    "filter.type": "urn:tag", "signal.location": point(lat, lng), "signal.location.radius": o.radiusM, "filter.tag.types": o.tagTypes, take: o.take ?? 50,
  }, TagsResp);
  return wrap(r, (d) => rows(d.results).map(tagOf));
}

/** The same tag insights for a whole locality by name ("Atlanta" resolves to the city; "New York" would be the state). The lift baseline. */
export async function cityTags(c: QlooClient, city: string, o: { tagTypes?: string; trends?: "high" | "low" | "off"; take?: number } = {}): Promise<QlooResult<QlooTag[]>> {
  const r = await c.call("city-tags", "/v2/insights", {
    "filter.type": "urn:tag", "signal.location.query": city, "filter.tag.types": o.tagTypes, "bias.trends": o.trends, take: o.take ?? 50,
  }, TagsResp);
  return wrap(r, (d) => rows(d.results).map(tagOf));
}

/** Brands whose fans over-index around a point: the media-owner's "who to pitch" list. */
export async function brandsByPlace(c: QlooClient, lat: number, lng: number, o: { radiusM?: number; take?: number } = {}): Promise<QlooResult<QlooBrand[]>> {
  const r = await c.call("brands-by-place", "/v2/insights", {
    "filter.type": "urn:entity:brand", "signal.location": point(lat, lng), "signal.location.radius": o.radiusM, take: o.take ?? 10,
  }, EntitiesResp);
  return wrap(r, (d) => rows(d.results).map(brandOf));
}

/** Age and gender affinity (-1..1) for an entity's audience. Not used by Wallspace (taste only); kept for the shared client contract. */
export async function demographics(c: QlooClient, entityIds: string[]): Promise<QlooResult<DemographicBucket>> {
  const r = await c.call("demographics", "/v2/insights", { "filter.type": "urn:demographics", "signal.interests.entities": entityIds.join(",") }, DemographicsResp);
  return wrap(r, (d) => {
    const out: DemographicBucket = {};
    const q = d.results.demographics[0]?.query ?? {};
    for (const [group, buckets] of Object.entries(q)) {
      if (buckets && typeof buckets === "object") for (const [k, v] of Object.entries(buckets as Record<string, unknown>)) if (typeof v === "number") out[`${group}:${k}`] = v;
    }
    return out;
  });
}

export interface Explained { id: string; name: string; because: { anchorId: string; name: string | null; score: number }[] }

/**
 * Why a brand ranks for the anchors. Qloo answers with anchor ids and scores only (query.explainability["signal.interests.entities"]);
 * names are resolved from the caller's own anchor list. With a single anchor every score is 1.
 */
export async function explain(c: QlooClient, anchors: { id: string; name: string }[], lat: number, lng: number): Promise<QlooResult<Explained[]>> {
  const r = await c.call("explain", "/v2/insights", {
    "filter.type": "urn:entity:brand", "signal.interests.entities": anchors.map((a) => a.id).join(","), "signal.location": point(lat, lng), "feature.explainability": true, take: 5,
  }, EntitiesResp);
  const names = new Map(anchors.map((a) => [a.id.toUpperCase(), a.name]));
  return wrap(r, (d) => rows(d.results).map((e) => {
    const ex = (e.query?.explainability?.["signal.interests.entities"] ?? []) as { entity_id?: string; score?: number }[];
    return { id: e.entity_id, name: e.name, because: Array.isArray(ex) ? ex.filter((x) => x.entity_id).map((x) => ({ anchorId: x.entity_id as string, name: names.get((x.entity_id as string).toUpperCase()) ?? null, score: x.score ?? 0 })) : [] };
  }));
}
