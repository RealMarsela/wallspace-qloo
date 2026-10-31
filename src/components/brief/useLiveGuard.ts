"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { GuardState } from "./GuardNotice";

/** Debounced POST /api/guard on the brief text. */
export function useLiveGuard(text: string, loves: string[] = [], delay = 450): GuardState {
  const [state, setState] = useState<{ text: string; s: GuardState }>({ text: "", s: { phase: "idle" } });
  const trimmed = text.trim();
  const lovesKey = loves.join("\u0000");
  useEffect(() => {
    if (!trimmed) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api.guard(trimmed.slice(0, 2000), ctrl.signal, lovesKey ? lovesKey.split("\u0000") : undefined).then(
        (verdict) => setState({ text: trimmed, s: { phase: "done", verdict } }),
        (e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setState({ text: trimmed, s: { phase: "error", message: e instanceof Error ? e.message : "error" } });
        },
      );
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed, lovesKey, delay]);
  if (!trimmed) return { phase: "idle" };
  return state.text === trimmed ? state.s : { phase: "checking" };
}
