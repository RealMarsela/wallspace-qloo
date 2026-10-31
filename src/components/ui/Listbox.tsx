"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check } from "./icons";
import { ChevronUpDown, Search } from "./icons-app";
import { PopoverPanel, usePopover } from "./Popover";

export interface ListOption {
  value: string;
  label: string;
  hint?: string;
  group?: string;
  /** Extra words the search box matches (ids, neighbourhoods). */
  keywords?: string;
}

/** Designed select (shadcn Select / Combobox pattern): a field-styled button opens a floating option list. With `searchable`
 *  it becomes a combobox that filters as you type. Arrow keys, Home/End, Enter, Esc and type-ahead all work. */
export function Listbox({
  value,
  onChange,
  options,
  label,
  placeholder = "Choose",
  searchable = false,
  testId,
  className = "",
  size = "md",
  renderValue,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: ListOption[];
  label: string;
  placeholder?: string;
  searchable?: boolean;
  testId?: string;
  className?: string;
  size?: "sm" | "md";
  renderValue?: (o: ListOption) => ReactNode;
}) {
  const { open, setOpen, close, triggerRef, panelRef } = usePopover();
  const id = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const chosen = options.find((o) => o.value === value) ?? null;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => `${o.label} ${o.hint ?? ""} ${o.keywords ?? ""} ${o.group ?? ""}`.toLowerCase().includes(t)) : options;
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
      else listRef.current?.focus();
      listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
  }, [open, searchable]);

  function openList() {
    setQ("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function pick(o: ListOption | undefined) {
    if (!o) return;
    onChange(o.value);
    close();
  }
  function move(n: number) {
    const next = Math.min(Math.max(0, n), shown.length - 1);
    setActive(next);
    listRef.current?.querySelectorAll('[role="option"]')[next]?.scrollIntoView({ block: "nearest" });
  }
  function onKey(e: KeyboardEvent) {
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || ((k === "Home" || k === "End") && !searchable)) e.preventDefault();
    if (k === "ArrowDown") return move(active + 1);
    if (k === "ArrowUp") return move(active - 1);
    if (k === "Home" && !searchable) return move(0);
    if (k === "End" && !searchable) return move(shown.length - 1);
    if (k === "Enter") return pick(shown[active]);
    if (e.key === "Tab") return close(false);
    if (!searchable && e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) move(hit);
    }
  }

  const h = size === "sm" ? "h-8 text-small" : "h-10 text-body";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={label}
        data-testid={testId}
        data-value={value ?? ""}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openList();
          }
        }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-md border border-line bg-surface px-3 text-left text-ink transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_25%)] focus-visible:border-cobalt focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cobalt/20 ${h} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${chosen ? "" : "text-muted"}`}>{chosen ? (renderValue ? renderValue(chosen) : chosen.label) : placeholder}</span>
        <ChevronUpDown size={16} className="shrink-0 text-muted" />
      </button>
      <PopoverPanel open={open} anchor={triggerRef} panelRef={panelRef} matchWidth className="w-[min(380px,calc(100vw-16px))]" testId={testId ? `${testId}-panel` : undefined}>
        {searchable ? (
          <div className="relative mb-1 border-b border-line pb-1">
            <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-[calc(50%+2px)] text-muted" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              role="searchbox"
              aria-label={`Search ${label.toLowerCase()}`}
              aria-controls={`${id}-list`}
              aria-activedescendant={shown[active] ? `${id}-o-${active}` : undefined}
              placeholder="Type to filter"
              data-testid={testId ? `${testId}-search` : undefined}
              className="h-9 w-full rounded-[6px] bg-transparent pl-8 pr-2 text-small text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
        ) : null}
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={searchable ? -1 : 0}
          aria-activedescendant={!searchable && shown[active] ? `${id}-o-${active}` : undefined}
          onKeyDown={searchable ? undefined : onKey}
          className="max-h-[min(320px,50vh)] overflow-y-auto outline-none"
        >
          {shown.length === 0 ? <li className="px-2.5 py-2 text-small text-muted">No match for &ldquo;{q}&rdquo;.</li> : null}
          {shown.map((o, i) => {
            const head = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
            const sel = o.value === value;
            return (
              <li key={o.value} role="presentation">
                {head ? <p className="eyebrow px-2.5 pb-1 pt-2">{head}</p> : null}
                <div
                  id={`${id}-o-${i}`}
                  role="option"
                  aria-selected={sel}
                  data-testid={testId ? `${testId}-option-${o.value}` : undefined}
                  onPointerMove={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-small ${i === active ? "bg-panel" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint ? <span className="block truncate text-micro text-muted">{o.hint}</span> : null}
                  </span>
                  {sel ? <Check size={16} className="shrink-0 text-ink" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </PopoverPanel>
    </>
  );
}
