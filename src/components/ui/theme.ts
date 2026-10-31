"use client";
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

function read(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** The colour scheme showing (system setting, or a data-theme override). Used to pick the basemap. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
