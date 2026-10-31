"use client";
import Link from "next/link";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { PopoverPanel, usePopover, type Placement } from "./Popover";

export interface MenuItem {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  testId?: string;
}
export type MenuEntry = MenuItem | { id: string; separator: true } | { id: string; heading: ReactNode };

const isItem = (e: MenuEntry): e is MenuItem => !("separator" in e) && !("heading" in e);

/** Dropdown menu (shadcn DropdownMenu pattern): a trigger button and a floating list with role=menu, arrow keys, Home/End,
 *  Esc and outside click to close, focus back on the trigger. Items are links or actions. */
export function Menu({
  trigger,
  items,
  placement = "bottom-end",
  label,
  className = "",
  triggerClassName = "",
  testId,
  header,
}: {
  trigger: ReactNode;
  items: MenuEntry[];
  placement?: Placement;
  label: string;
  className?: string;
  triggerClassName?: string;
  testId?: string;
  header?: ReactNode;
}) {
  const { open, setOpen, close, triggerRef, panelRef } = usePopover();
  const id = useId();
  const refs = useRef<(HTMLElement | null)[]>([]);
  const actionable = items.filter(isItem).filter((i) => !i.disabled);

  useEffect(() => {
    if (open) requestAnimationFrame(() => refs.current[0]?.focus());
  }, [open]);

  function onKey(e: KeyboardEvent) {
    const els = refs.current.filter(Boolean) as HTMLElement[];
    const i = els.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => els[(n + els.length) % els.length]?.focus();
    const to: Record<string, number> = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: els.length - 1 };
    if (e.key in to) {
      e.preventDefault();
      go(to[e.key]);
    } else if (e.key === "Tab") close(false);
  }

  let n = -1;
  const row = "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-small outline-none transition-colors focus-visible:bg-panel hover:bg-panel disabled:opacity-50";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        data-testid={testId}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <PopoverPanel open={open} anchor={triggerRef} panelRef={panelRef} placement={placement} role="menu" id={id} label={label} className={`min-w-[220px] ${className}`} testId={testId ? `${testId}-panel` : undefined}>
        <div onKeyDown={onKey}>
          {header}
          {items.map((e) => {
            if ("separator" in e) return <hr key={e.id} className="my-1 border-line" />;
            if ("heading" in e)
              return (
                <p key={e.id} className="eyebrow px-2.5 pb-1 pt-2">
                  {e.heading}
                </p>
              );
            const k = e.disabled ? -1 : ++n;
            const ref = (el: HTMLElement | null) => {
              if (k >= 0) refs.current[k] = el;
            };
            const body = (
              <>
                {e.icon ? <span className={`shrink-0 ${e.danger ? "text-guard" : "text-muted"}`}>{e.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className={`block ${e.danger ? "text-guard" : ""}`}>{e.label}</span>
                  {e.hint ? <span className="block truncate text-micro text-muted">{e.hint}</span> : null}
                </span>
              </>
            );
            if (e.href && !e.disabled) {
              const after = () => close(false);
              return e.external ? (
                <a key={e.id} ref={ref} role="menuitem" tabIndex={-1} href={e.href} target="_blank" rel="noreferrer" data-testid={e.testId} onClick={after} className={row}>
                  {body}
                </a>
              ) : (
                <Link key={e.id} ref={ref} role="menuitem" tabIndex={-1} href={e.href} data-testid={e.testId} onClick={after} className={row}>
                  {body}
                </Link>
              );
            }
            return (
              <button
                key={e.id}
                ref={ref}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={e.disabled}
                data-testid={e.testId}
                onClick={() => {
                  close();
                  e.onSelect?.();
                }}
                className={row}
              >
                {body}
              </button>
            );
          })}
          {actionable.length === 0 && !header ? <p className="px-2.5 py-2 text-small text-muted">Nothing here yet.</p> : null}
        </div>
      </PopoverPanel>
    </>
  );
}
