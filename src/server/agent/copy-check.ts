// A billboard line is read once from a moving car, so a fragment ("Catch the.") must never ship. This validator is the one gate for
// every copy line: a line over the limit or not a complete phrase is rejected, never trimmed.

export const MAX_WORDS = 7;
export const MIN_WORDS = 2;

export const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

// Words a finished phrase cannot end on: articles and determiners, prepositions, conjunctions, possessives, a trailing "to"/"of".
// Words that can close a phrase ("up", "out", "over", "that", "this", "here", "do", "can", "it") are deliberately not listed.
const DANGLING = new Set([
  "a", "an", "the", "some", "any", "every", "each", "these", "those", "another",
  "of", "to", "in", "on", "at", "for", "with", "from", "by", "into", "onto", "about", "after", "before", "until", "till", "through",
  "between", "under", "against", "toward", "towards", "via", "per", "like", "within", "without", "during", "across", "beyond", "upon",
  "and", "or", "but", "nor", "because", "while", "when", "where", "if", "than", "as", "whether", "although", "though", "unless", "since",
  "your", "our", "my", "their", "his", "its",
  // A pronoun or question word plus 's / 're / 'll / 've always wants a predicate ("Who's.", "Let's.").
  "who's", "what's", "where's", "when's", "how's", "why's", "that's", "it's", "there's", "here's", "he's", "she's", "let's",
  "we're", "you're", "they're", "i'm", "i'll", "we'll", "you'll", "they'll", "i've", "we've", "you've", "they've", "who'd", "who'll", "what'll",
]);

const CLOSERS = /["'‘’“”)\]}*]+$/;
const EMOJI = /\p{Extended_Pictographic}/u;

export type LineCheck = { ok: true } | { ok: false; reason: string };

const bad = (reason: string): LineCheck => ({ ok: false, reason });

function quotesBalanced(t: string): boolean {
  const straight = (t.match(/"/g) ?? []).length;
  const open = (t.match(/“/g) ?? []).length;
  const close = (t.match(/”/g) ?? []).length;
  const pairs: [string, string][] = [["(", ")"], ["[", "]"], ["{", "}"]];
  return straight % 2 === 0 && open === close && pairs.every(([o, c]) => t.split(o).length === t.split(c).length);
}

// The last word of a sentence, lower-cased, without punctuation or closing quotes ("Catch the." -> "the").
function lastWord(sentence: string): string {
  const w = sentence.trim().replace(CLOSERS, "").split(/\s+/).pop() ?? "";
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replace(/\u2019/g, "'").toLowerCase();
}

export function checkLine(text: string): LineCheck {
  const t = text.trim();
  if (!t) return bad("empty line");
  const n = wordCount(t);
  if (n > MAX_WORDS) return bad(`${n} words (limit ${MAX_WORDS})`);
  if (n < MIN_WORDS) return bad("a single word is not a line");
  if (t.includes("#") || EMOJI.test(t)) return bad("hashtags and emoji are not allowed");
  if (!quotesBalanced(t)) return bad("unbalanced quotes or brackets");
  const bare = t.replace(CLOSERS, "");
  if (/(?:[,;:–—-]|\.{3}|…)$/.test(bare)) return bad("ends mid-phrase (trailing punctuation)");
  // Every sentence must close: "Little Five laughs loudest. Catch the." fails on its last sentence.
  for (const s of t.split(/(?<=[.!?])\s+/).filter((x) => x.trim())) {
    const w = lastWord(s);
    if (!w) return bad("ends mid-phrase");
    if (DANGLING.has(w)) return bad(`ends mid-phrase on "${w}"`);
  }
  return { ok: true };
}

export const isCompleteLine = (text: string) => checkLine(text).ok;

export interface Rejected { text: string; reason: string }

export interface Sorted<T extends { text: string }> { valid: T[]; rejected: (Rejected & { item: T })[] }

// Splits candidate lines into valid ones (first occurrence of a text only) and rejected ones with the reason.
export function sortLines<T extends { text: string }>(lines: T[], already: string[] = []): Sorted<T> {
  const seen = new Set(already.map(norm));
  const out: Sorted<T> = { valid: [], rejected: [] };
  for (const item of lines) {
    const c = checkLine(item.text);
    if (!c.ok) out.rejected.push({ text: item.text.trim(), reason: c.reason, item });
    else if (seen.has(norm(item.text))) out.rejected.push({ text: item.text.trim(), reason: "duplicate of another line", item });
    else {
      seen.add(norm(item.text));
      out.valid.push(item);
    }
  }
  return out;
}

const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const describeRejected = (r: Rejected[]) => r.map((x) => `"${x.text}" (${x.reason})`).join("; ");
