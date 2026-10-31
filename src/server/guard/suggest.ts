import type { Hit } from "./detect";

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// A taste version of a refused brief: what the planner already said they love, or what the sentence itself says they love.
export const GENERIC_SUGGESTION = "describe them by what they love: shows, music, places or hobbies";

// Always returns something: the planner's chips, else what the sentence says they love, else a prompt to describe taste.
export function tasteSuggestion(text: string, loves: string[] | undefined): string {
  const chips = (loves ?? []).map((l) => l.trim()).filter(Boolean);
  if (chips.length) return `fans of ${joinList(chips)}`;
  const m = /\b(?:love[sd]?|into|enjoy(?:s|ed)?|like[sd]?|fans? of|watch(?:es)?|listen(?:s)? to)\s+(.{3,80})$/i.exec(text.trim());
  if (m) {
    const taste = m[1].replace(/[.!?]+$/, "").trim();
    if (taste) return `fans of ${taste}`;
  }
  return GENERIC_SUGGESTION;
}

export function reasonFor(h: Hit): string {
  return `Targets people by ${h.label} ("${h.term}"). Wallspace plans by taste, never identity.`;
}
