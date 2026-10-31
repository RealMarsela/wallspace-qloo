// WebCrypto helpers shared by the Composio and Slack signature checks. No Node crypto: this runs on Workers.

const enc = new TextEncoder();

export async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

// Constant-time string compare; length mismatch still walks the longer input.
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Accepts seconds or milliseconds since epoch and checks it is within toleranceSec of now.
export function withinTolerance(ts: string, toleranceSec: number, nowMs = Date.now()): boolean {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return false;
  const sec = n > 1e12 ? n / 1000 : n;
  return Math.abs(nowMs / 1000 - sec) <= toleranceSec;
}
