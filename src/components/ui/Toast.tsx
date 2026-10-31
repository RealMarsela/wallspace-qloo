"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Close, Info, Alert } from "./icons";

type Kind = "ok" | "info" | "guard";
interface ToastMsg {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}
type Push = (t: { kind?: Kind; title: string; body?: string; ms?: number }) => void;

const Ctx = createContext<Push | null>(null);

/** Wrap a page (or the app shell) once; call useToast()(...) anywhere below. Toasts stack bottom-right on night cards. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback<Push>(
    ({ kind = "info", title, body, ms = 4500 }) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { id, kind, title, body }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[360px]">
        {items.map((t) => (
          <div key={t.id} role="status" className="ws-rise pointer-events-auto flex w-full items-start gap-3 rounded-md border border-night-line bg-night p-3.5 text-on-night shadow-lg [--delay:0ms]">
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-xs text-[#22211d] ${t.kind === "ok" ? "bg-park" : t.kind === "guard" ? "bg-poster" : "bg-signal"}`}>
              {t.kind === "ok" ? <Check size={14} /> : t.kind === "guard" ? <Alert size={14} /> : <Info size={14} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-small">{t.title}</span>
              {t.body ? <span className="mt-0.5 block text-micro text-on-night-muted">{t.body}</span> : null}
            </span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded-xs p-0.5 text-on-night-muted hover:text-on-night">
              <Close size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Push {
  const push = useContext(Ctx);
  return push ?? (() => undefined);
}
