"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "./icons";

/** Modal dialog and side Sheet on native <dialog> (focus trap, Esc, inert background for free).
 *  Controlled by `open`; onClose fires on Esc, backdrop click and the close button. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "modal",
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "sheet";
  testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const shape =
    variant === "sheet"
      ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-[480px] rounded-none sm:rounded-l-lg"
      : "m-auto w-[calc(100%-32px)] max-w-[520px] rounded-lg";
  return (
    <dialog
      ref={ref}
      data-testid={testId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`${shape} border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-[#22211d]/45 backdrop:backdrop-blur-[2px] ws-rise [--delay:0ms]`}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-h4">{title}</h2>
            {description ? <p className="mt-1 text-small text-muted">{description}</p> : null}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-xs p-1 text-muted hover:bg-panel hover:text-ink">
            <Close size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
