import type { Theme } from "@/components/ui/theme";

// OpenFreeMap: keyless OpenStreetMap vector tiles.
export const basemap = (t: Theme) =>
  t === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";

export const ATLANTA: [number, number] = [-84.39, 33.765];

// Heat ramp from the street inks: transparent, signal yellow, orange, poster red. Kept translucent so streets show through.
export const heatRamp = (t: Theme) =>
  t === "dark"
    ? ["rgba(0,0,0,0)", "rgba(255,209,46,0.10)", "rgba(255,209,46,0.30)", "rgba(255,138,61,0.48)", "rgba(255,91,58,0.62)", "rgba(255,155,107,0.78)"]
    : ["rgba(255,255,255,0)", "rgba(255,209,46,0.14)", "rgba(255,209,46,0.36)", "rgba(255,138,61,0.50)", "rgba(255,91,58,0.62)", "rgba(226,64,31,0.74)"];

// MapLibre 6's own relative worker URL breaks under the bundler, and a third-party CDN worker is blocked by some
// browsers (Brave Shields), so the worker is served same-origin from public/vendor. Must match the installed version;
// src/components/map/worker.test.ts fails if it drifts. Refresh with:
//   cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/vendor/maplibre-gl-worker-<version>.js
export const MAPLIBRE_VERSION = "6.16.0";
export const WORKER_URL = `/vendor/maplibre-gl-worker-${MAPLIBRE_VERSION}.js`;
