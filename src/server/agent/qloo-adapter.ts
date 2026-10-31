import type { Seed } from "@/contract";
import { ATLANTA_WKT, cityTags, heatmap, search, tags, tagsByPlace, type QlooClient, type QlooResult } from "../qloo";
import { rankTags, tagScore } from "../qloo/lift";
import { CITY } from "../qloo/card";
import type { QlooTag } from "../qloo/types";
import type { BlockTag, Called, QlooPort, TrendRow, VocabItem } from "./ports";

// Wraps lane B1's Qloo client (KV cache, call cap, ledger all live inside it) into the pipeline's QlooPort.
// Shapes follow qloo-probe/SHAPES.md. The vocabulary is the two media/music genre namespaces of /v2/tags (audiences were never observed).
const TAG_TYPES = ["urn:tag:genre:media", "urn:tag:genre:music"];
/** /search is a name lookup: without a type filter, "90s sitcoms" returns a Newcastle comedy club and "southern hip-hop" a locality. */
const SEARCH_TYPES = "urn:entity:tv_show,urn:entity:movie,urn:entity:artist";
const STOP = new Set(["the", "a", "an", "of", "and", "in", "to", "for", "with", "on"]);

function called<T>(r: QlooResult<unknown>, tool: string, data: T): Called<T> {
  return { data, cached: r.source.cached, ms: r.source.ms, tool, requestId: r.source.requestId };
}

const words = (s: string) => s.toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
/** A search hit counts as the thing the audience loves only when at least half of the phrase's words appear in its name. */
export const nameMatches = (query: string, name: string): boolean => {
  const q = words(query);
  const n = new Set(words(name));
  return q.length > 0 && q.filter((w) => n.has(w)).length / q.length >= 0.5;
};

export function qlooPortFor(c: QlooClient): QlooPort {
  const baseline = async () => (await cityTags(c, CITY, { take: 50 }).catch(() => null)) ?? null;
  return {
    async vocabulary() {
      const items = new Map<string, VocabItem>();
      let last: QlooResult<unknown> | null = null;
      let ms = 0;
      let cachedAll = true;
      for (const type of TAG_TYPES) {
        const r = await tags(c, { types: type, take: 100 });
        last = r;
        ms += r.source.ms;
        cachedAll = cachedAll && r.source.cached;
        for (const t of r.data) if (t.id && /^[A-Za-z]/.test(t.name)) items.set(t.id, { id: t.id, name: t.name, kind: "tag", type: t.type ?? type });
      }
      const out = called(last as QlooResult<unknown>, "qloo.tags", [...items.values()]);
      return { ...out, ms, cached: cachedAll };
    },
    async search(query) {
      const r = await search(c, query, { types: SEARCH_TYPES, take: 3 });
      // Obscure rows (popularity unknown or under 0.5) make a poor anchor for a city-wide heatmap, so they are not taken either.
      const hit = r.data.find((h) => (h.popularity ?? 0) >= 0.5 && nameMatches(query, h.name));
      const seed: Seed | null = hit ? { qlooId: hit.id, name: hit.name, type: hit.types[0] ?? "urn:entity", via: "search", similarity: null } : null;
      return called(r, "qloo.search", seed);
    },
    async heatmap(seeds) {
      const entityIds = seeds.filter((s) => s.type.startsWith("urn:entity")).map((s) => s.qlooId);
      const tagIds = seeds.filter((s) => s.type.startsWith("urn:tag")).map((s) => s.qlooId);
      const r = await heatmap(c, { entityIds: entityIds.length ? entityIds : undefined, tagIds: tagIds.length ? tagIds : undefined, wkt: ATLANTA_WKT });
      return called(r, "qloo.insights urn:heatmap", r.data);
    },
    async blockTags(face) {
      const [r, city] = await Promise.all([tagsByPlace(c, face.lat, face.lng, { take: 50 }), baseline()]);
      const useCity = !!city;
      const rows: BlockTag[] = rankTags(r.data, useCity ? city.data : null).map((t) => ({ id: t.id, name: t.name, affinity: tagScore(t), lift: t.lift }));
      return called(r, useCity ? "qloo.insights urn:tag + signal.location, lift vs Atlanta" : "qloo.insights urn:tag + signal.location", rows);
    },
    // Qloo has no trending for places or tags. The usable signal is bias.trends: a tag is "rising" when the trend-biased Atlanta list
    // ranks it higher than the plain Atlanta list (or lists it when the plain list does not).
    async trending(tagNames) {
      const want = [...new Set(tagNames.map((n) => n.toLowerCase()))];
      const [plain, trend] = await Promise.all([cityTags(c, CITY, { take: 50 }).catch(() => null), cityTags(c, CITY, { take: 50, trends: "high" }).catch(() => null)]);
      if (!plain || !trend) return { data: want.map((name) => ({ name, rising: false, delta: null })), cached: true, ms: 0, tool: "qloo.insights urn:tag bias.trends (Qloo unavailable; nothing marked rising)" };
      const rank = (rows: QlooTag[]) => new Map(rows.map((t, i) => [t.name.toLowerCase(), i + 1] as const));
      const pr = rank(plain.data);
      const tr = rank(trend.data);
      const data: TrendRow[] = want.map((name) => {
        const t = tr.get(name);
        const p = pr.get(name);
        return { name, rising: t !== undefined && (p === undefined || t < p), delta: t !== undefined && p !== undefined ? p - t : null };
      });
      return called(trend, "qloo.insights urn:tag bias.trends", data);
    },
  };
}
