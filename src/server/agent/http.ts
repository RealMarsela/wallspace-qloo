// Small request helpers shared by the API routes of this lane.
export function sessionIdOf(request: Request): string {
  return request.headers.get("x-session-id") ?? request.headers.get("cf-connecting-ip") ?? "anon";
}

// Constant-time string comparison (equal length work for equal-length inputs; length leaks only the length).
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export function bearerOk(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/.exec(h);
  return !!m && safeEqual(m[1], secret);
}

export function newId(prefix: string): string {
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return `${prefix}-${Date.now().toString(36)}${[...rnd].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
