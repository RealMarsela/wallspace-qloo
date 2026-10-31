"use client";
import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

type Settled<T> = { token: string; data: T; error: null } | { token: string; data: null; error: Error };

/** Runs an async loader on mount and whenever `key` changes; `retry` runs it again. */
export function useAsync<T>(load: () => Promise<T>, key: string): AsyncState<T> & { retry: () => void } {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const token = `${key}#${nonce}`;
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setSettled({ token, data, error: null }),
      (err: unknown) => live && setSettled({ token, data: null, error: err instanceof Error ? err : new Error("Could not load.") }),
    );
    return () => {
      live = false;
    };
    // `load` is recreated each render; `token` names what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  if (!settled || settled.token !== token) return { status: "loading", data: null, error: null, retry };
  if (settled.error) return { status: "error", data: null, error: settled.error, retry };
  return { status: "ready", data: settled.data as T, error: null, retry };
}
