import { policy, wordsRe, type PolicyGroup } from "./policy";

export interface Hit {
  group: string;
  label: string;
  term: string;
  clear: boolean; // clear = refuse without asking a model; false = ambiguous
}

export interface Detection {
  identity: Hit[];
  claims: { kind: "health" | "financial"; term: string }[];
}

export function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/'s\b/g, "").replace(/[^a-z0-9+$%]+/g, " ").trim();
}

const allowRe = wordsRe(policy.allow);
const personNouns = new Set(policy.personNouns);
const tasteNouns = new Set(policy.tasteNouns);

// Words of an allow-listed phrase are blanked so they never match a group term.
function maskAllowed(norm: string): string {
  return allowRe ? norm.replace(allowRe, (m) => m.replace(/[a-z0-9]/g, "_")) : norm;
}

function hasPersonNounWithin(tokens: string[], from: number, span: number): boolean {
  return tokens.slice(from, from + span).some((t) => personNouns.has(t));
}

function precededByTargetVerb(tokens: string[], idx: number): boolean {
  const before = ` ${tokens.slice(Math.max(0, idx - 4), idx).join(" ")} `;
  return policy.targetVerbs.some((v) => before.includes(` ${v} `));
}

function tokenIndexOf(tokens: string[], phrase: string[], start: number): number {
  for (let i = start; i + phrase.length <= tokens.length; i++) {
    if (phrase.every((p, k) => tokens[i + k] === p)) return i;
  }
  return -1;
}

function scanGroup(g: PolicyGroup, tokens: string[], out: Hit[]) {
  const push = (term: string, clear: boolean) => out.push({ group: g.id, label: g.label, term, clear });
  const text = ` ${tokens.join(" ")} `;
  for (const term of [...g.plural, ...g.phrases]) {
    if (text.includes(` ${term} `)) push(term, true);
  }
  for (const term of g.colour ?? []) {
    const phrase = term.split(" ");
    for (let i = tokenIndexOf(tokens, phrase, 0); i >= 0; i = tokenIndexOf(tokens, phrase, i + 1)) {
      const next = tokens[i + phrase.length];
      if (next && tasteNouns.has(next)) continue;
      if (hasPersonNounWithin(tokens, i + phrase.length, 2) || (precededByTargetVerb(tokens, i) && next !== undefined && !tasteNouns.has(next))) push(term, true);
    }
  }
  for (const term of g.adj) {
    const phrase = term.split(" ");
    for (let i = tokenIndexOf(tokens, phrase, 0); i >= 0; i = tokenIndexOf(tokens, phrase, i + 1)) {
      const next = tokens[i + phrase.length];
      if (next && tasteNouns.has(next)) continue;
      if (hasPersonNounWithin(tokens, i + phrase.length, 2)) push(term, true);
      else push(term, false);
    }
  }
}

function ageHits(raw: string, out: Hit[]) {
  const re = new RegExp(policy.age.bandPattern, "gi");
  const lower = raw.toLowerCase();
  for (const m of lower.matchAll(re)) {
    const before = lower.slice(Math.max(0, (m.index ?? 0) - 40), m.index).split(/[^a-z]+/).filter(Boolean).slice(-4);
    const explicit = /\b(?:aged?|ages|years?|yrs?|y\/o|yo|olds?)\b/.test(m[0]) || /\bage/.test(before.join(" "));
    const person = before.some((t) => personNouns.has(t) || /^(?:reach|target|for)$/.test(t));
    if (explicit || person) out.push({ group: "age", label: "age used as identity", term: m[0].trim(), clear: true });
  }
}

function claimHits(raw: string, out: Detection["claims"]) {
  const lower = raw.toLowerCase().replace(/[‘’]/g, "'").replace(/-/g, " ");
  for (const kind of ["health", "financial"] as const) {
    for (const term of policy.claims[kind]) {
      const re = new RegExp(`(?<![a-z0-9])(?:${term})(?![a-z0-9])`, "i");
      const m = re.exec(lower);
      if (m) out.push({ kind, term: m[0] });
    }
  }
}

export function detect(text: string, opts: { claims: boolean }): Detection {
  const tokens = maskAllowed(normalise(text)).split(" ").filter(Boolean);
  const identity: Hit[] = [];
  for (const g of policy.groups) scanGroup(g, tokens, identity);
  ageHits(text.replace(allowRe ?? /$^/g, " "), identity);
  const claims: Detection["claims"] = [];
  if (opts.claims) claimHits(text, claims);
  const seen = new Set<string>();
  const unique = identity.filter((h) => !seen.has(h.group + h.term) && seen.add(h.group + h.term));
  return { identity: unique, claims };
}
