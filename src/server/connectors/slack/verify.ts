import { hmacSha256, safeEqual, toHex, withinTolerance } from "../composio/crypto";

export const SLACK_TOLERANCE_SEC = 300;

export type SlackSigResult = { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" };

// X-Slack-Signature = "v0=" + hex(HMAC-SHA256(signingSecret, `v0:${timestamp}:${rawBody}`)). Five-minute window.
export async function verifySlackSignature(
  rawBody: string,
  headers: { timestamp: string | null; signature: string | null },
  signingSecret: string,
  nowMs = Date.now(),
): Promise<SlackSigResult> {
  const { timestamp, signature } = headers;
  if (!timestamp || !signature || !signingSecret) return { ok: false, reason: "missing" };
  if (!withinTolerance(timestamp, SLACK_TOLERANCE_SEC, nowMs)) return { ok: false, reason: "stale" };
  const want = `v0=${toHex(await hmacSha256(signingSecret, `v0:${timestamp}:${rawBody}`))}`;
  return safeEqual(want, signature) ? { ok: true } : { ok: false, reason: "mismatch" };
}
