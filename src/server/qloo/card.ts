import type { AudienceCard, Face } from "@/contract";
import type { QlooClient, QlooSource } from "./client";
import { brandsByPlace, cityTags, tagsByPlace } from "./endpoints";
import { ninesScore, rankTags, tagScore } from "./lift";

export const CITY = "Atlanta"; // resolves to the city (Fulton County), not the state

/**
 * Media-owner mode: what the block around a face over-indexes on (Qloo tag insights at the face's point, ranked against the same query
 * for the whole city so blocks differ) and which brands' fans over-index there (brand insights at the same point). Taste by place only:
 * identity-style tags are dropped, and nothing here is about a person. Any Qloo failure throws QlooError; the baseline alone may be
 * missing, in which case the tags carry no lift. `sources` says per section whether it was a live call or a KV copy of one.
 */
export async function buildAudienceCard(c: QlooClient, face: Pick<Face, "id" | "lat" | "lng">, now: Date = new Date()): Promise<{ card: AudienceCard; source: QlooSource[]; sources: { tags: QlooSource; brands: QlooSource; baseline: QlooSource | null } }> {
  const [t, b, city] = await Promise.all([
    tagsByPlace(c, face.lat, face.lng, { take: 50 }),
    brandsByPlace(c, face.lat, face.lng, { take: 10 }),
    cityTags(c, CITY, { take: 50 }).catch(() => null),
  ]);
  const baseline = city;
  const topTags = rankTags(t.data, baseline?.data ?? null, 8).map((x) => ({ name: x.name, score: tagScore(x), lift: x.lift }));
  const brands = b.data.filter((x) => x.name).sort((x, y) => (y.affinity ?? 0) - (x.affinity ?? 0)).slice(0, 6)
    .map((x) => ({ name: x.name, qlooId: x.id, score: ninesScore(x.affinity) }));
  return {
    card: { faceId: face.id, topTags, brands, generatedAt: now.toISOString() },
    source: [t.source, b.source, ...(baseline ? [baseline.source] : [])],
    sources: { tags: t.source, brands: b.source, baseline: baseline?.source ?? null },
  };
}
