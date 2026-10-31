"use client";
import { useState } from "react";
import type { Ink } from "@/components/ui/Pill";
import { inkTint } from "@/components/ui/Pill";
import { Close } from "@/components/ui/icons";

const INKS: Ink[] = ["signal", "park", "lilac", "cobalt", "poster"];
const MAX = 8;

/** "Fans of…" tag input: type a taste and press Enter or comma to add it, Backspace on an empty field removes the last.
 *  Tags are tinted street inks like the plan's taste tags. */
export function LovesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "").trim();
    if (t && !value.includes(t) && value.length < MAX) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="loves-input" className="text-small text-ink">
        Fans of
      </label>
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface p-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-cobalt focus-within:ring-[3px] focus-within:ring-cobalt/20"
        data-testid="loves-chips"
      >
        {value.map((l, i) => (
          <span key={l} data-testid={`love-chip-${l}`} className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-small ${inkTint[INKS[i % INKS.length]]}`}>
            {l}
            <button type="button" data-testid={`love-remove-${l}`} aria-label={`Remove ${l}`} onClick={() => onChange(value.filter((x) => x !== l))} className="grid size-5 place-items-center rounded-full hover:bg-black/10">
              <Close size={12} />
            </button>
          </span>
        ))}
        <input
          id="loves-input"
          data-testid="loves-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          disabled={value.length >= MAX}
          placeholder={value.length >= MAX ? "Eight is the most" : value.length ? "Add another taste" : "e.g. stand-up comedy specials"}
          aria-describedby="loves-hint"
          className="h-8 min-w-[160px] flex-1 bg-transparent px-1.5 text-body text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p id="loves-hint" className="flex justify-between gap-3 text-micro text-muted">
        <span>Artists, shows, genres, places. Enter adds one. Tastes only, never who people are.</span>
        <span className="shrink-0 font-mono tabular-nums">
          {value.length}/{MAX}
        </span>
      </p>
    </div>
  );
}
