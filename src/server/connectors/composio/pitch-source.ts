import { AudienceCardResponse } from "@/contract";
import type { z } from "zod";

// The audience card for a face comes from B1's card route (GET /api/owner/faces/:id/card, contract AudienceCardResponse).
// Swappable for tests. null means the card could not be produced; the pitch route answers card_unavailable.

export type AudienceCardBundle = z.infer<typeof AudienceCardResponse>;
export type CardLoader = (faceId: string, origin: string) => Promise<AudienceCardBundle | null>;

let custom: CardLoader | null = null;

export function setCardLoader(fn: CardLoader | null): void {
  custom = fn;
}

const fetchLoader: CardLoader = async (faceId, origin) => {
  try {
    const res = await fetch(`${origin}/api/owner/faces/${encodeURIComponent(faceId)}/card`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const parsed = AudienceCardResponse.safeParse(await res.json().catch(() => null));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const loadAudienceCard: CardLoader = (faceId, origin) => (custom ?? fetchLoader)(faceId, origin);
