"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** Open state + refs for a trigger and its floating panel. Closes on outside pointer-down and Esc (focus returns to the trigger). */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, close]);
  return { open, setOpen, close, triggerRef, panelRef };
}

/** Positions the panel next to the trigger with fixed coordinates (written straight to the DOM, no re-render), flipped above
 *  when there is no room below and clamped to the viewport, so a panel is never clipped by a scrolling table or the sidebar. */
function useFloating(open: boolean, anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, placement: Placement, matchWidth: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      if (matchWidth) p.style.setProperty("min-width", `${a.width}px`);
      const ph = p.offsetHeight;
      const pw = p.offsetWidth;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 6;
      let top = placement.startsWith("top") ? a.top - ph - gap : a.bottom + gap;
      if (placement.startsWith("bottom") && top + ph > vh - 8 && a.top - ph - gap > 8) top = a.top - ph - gap;
      if (placement.startsWith("top") && top < 8 && a.bottom + gap + ph < vh - 8) top = a.bottom + gap;
      const left = Math.min(Math.max(8, placement.endsWith("end") ? a.right - pw : a.left), vw - pw - 8);
      p.style.setProperty("top", `${Math.max(8, top)}px`);
      p.style.setProperty("left", `${Math.max(8, left)}px`);
      p.style.setProperty("visibility", "visible");
    };
    place();
    const id = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, panel, placement, matchWidth]);
}

/** The floating surface: portalled to <body>, surface fill, hairline, large shadow, 8px radius. */
export function PopoverPanel({
  open,
  anchor,
  panelRef,
  placement = "bottom-start",
  matchWidth = false,
  className = "",
  children,
  role,
  id,
  label,
  testId,
}: {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  placement?: Placement;
  matchWidth?: boolean;
  className?: string;
  children: ReactNode;
  role?: string;
  id?: string;
  label?: string;
  testId?: string;
}) {
  useFloating(open, anchor, panelRef, placement, matchWidth);
  if (!open || typeof document === "undefined") return null;
  // Inside a modal <dialog> everything outside it is inert, so the panel joins the dialog's top layer instead of <body>.
  const host = anchor.current?.closest("dialog") ?? document.body;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={label}
      data-testid={testId}
      style={{ position: "fixed", top: 0, left: 0, visibility: "hidden" }}
      className={`ws-pop-in z-[70] rounded-md border border-line bg-surface p-1 text-ink shadow-lg ${className}`}
    >
      {children}
    </div>,
    host,
  );
}
