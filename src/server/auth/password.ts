// PBKDF2-SHA256 through WebCrypto. Workers cap PBKDF2 at 100,000 iterations, so that is the cost; each hash has its own 16-byte salt.
const ITERATIONS = 100_000;
const enc = new TextEncoder();

const b64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [scheme, iter, salt, want] = hash.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !want) return false;
  const got = await derive(password, unb64(salt), Number(iter));
  const exp = unb64(want);
  let diff = got.length ^ exp.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ (exp[i] ?? 0);
  return diff === 0;
}
