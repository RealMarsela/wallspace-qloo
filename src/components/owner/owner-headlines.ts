"use client";

import { useEffect, useMemo, useState } from "react";
import type { AudienceCard, Face } from "@/contract";
import { fetchCard, type CardSource } from "./owner-api";

export type Headline = { status: "loading" } | { status: "ready"; card: AudienceCard; source?: CardSource } | { status: "error"; message: string };

/** Audience headlines for a list of faces, four requests at a time (the API caches every Qloo answer).
 *  Loaded faces are kept when the list changes; failed or interrupted ones are fetched again. */
export function useHeadlines(faces: Face[]): { heads: Record<string, Headline>; retry: () => void } {
  const [heads, setHeads] = useState<Record<string, Headline>>({});
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    const queue = faces.filter((f) => heads[f.id]?.status !== "ready").map((f) => f.id);
    if (queue.length === 0) return;
    setHeads((h) => ({ ...h, ...Object.fromEntries(queue.map((id) => [id, { status: "loading" } as Headline])) }));
    const worker = async () => {
      for (let id = queue.shift(); id && live; id = queue.shift()) {
        const faceId = id;
        try {
          const { card, source } = await fetchCard(faceId);
          if (live) setHeads((h) => ({ ...h, [faceId]: { status: "ready", card, source } }));
        } catch (e) {
          if (live) setHeads((h) => ({ ...h, [faceId]: { status: "error", message: e instanceof Error ? e.message : "Could not load." } }));
        }
      }
    };
    void Promise.all([worker(), worker(), worker(), worker()]);
    return () => {
      live = false;
    };
    // Re-run only when the face list changes; `heads` is read for what is already loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, round]);

  // Fetch the failed faces again (a Qloo call that failed is never papered over; the row says so and this retries it).
  return { heads, retry: () => setRound((r) => r + 1) };
}

/** The faces whose ids are in `ids` (comma-joined), as an array that stays the same object while the set is unchanged. */
export function useStableFaces(faces: Face[], ids: string): Face[] {
  return useMemo(() => {
    const keep = new Set(ids.split(","));
    return faces.filter((f) => keep.has(f.id));
  }, [faces, ids]);
}
