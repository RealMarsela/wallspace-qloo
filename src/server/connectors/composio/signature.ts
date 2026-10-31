import { hmacSha256, safeEqual, toBase64, withinTolerance } from "./crypto";

export const COMPOSIO_TOLERANCE_SEC = 300;

export type SignatureResult = { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" };

// Composio webhooks (Standard Webhooks style): base64(HMAC-SHA256(secret, `${id}.${timestamp}.${rawBody}`)).
// The header may carry several space-separated `v1,<base64>` entries; any one that matches passes.
export async function verifyComposioSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowMs = Date.now(),
): Promise<SignatureResult> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return { ok: false, reason: "missing" };
  if (!withinTolerance(timestamp, COMPOSIO_TOLERANCE_SEC, nowMs)) return { ok: false, reason: "stale" };
  const expected = toBase64(await hmacSha256(secret, `${id}.${timestamp}.${rawBody}`));
  const candidates = signature.split(" ").map((part) => (part.includes(",") ? part.split(",").slice(1).join(",") : part));
  let matched = false;
  for (const c of candidates) if (safeEqual(expected, c)) matched = true;
  return matched ? { ok: true } : { ok: false, reason: "mismatch" };
}
