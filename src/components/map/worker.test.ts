import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAPLIBRE_VERSION, WORKER_URL } from "./map-style";

describe("MapLibre worker served from public/", () => {
  it("matches the installed maplibre-gl version", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "node_modules/maplibre-gl/package.json"), "utf8")) as { version: string };
    expect(MAPLIBRE_VERSION).toBe(pkg.version);
  });
  it("exists at the URL the map loads", () => {
    expect(existsSync(join(process.cwd(), "public", WORKER_URL))).toBe(true);
  });
});
