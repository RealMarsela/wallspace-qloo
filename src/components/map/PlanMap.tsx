"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import type { Face, HeatCell } from "@/contract";
import { useTheme } from "@/components/ui/theme";
import { ATLANTA, WORKER_URL, basemap, heatRamp } from "./map-style";
import { MapLegend } from "./MapLegend";
import { shieldElement, updateShield } from "./shield";

export interface MapPick {
  faceId: string;
  rank: number;
}

export interface PlanMapProps {
  heat: HeatCell[];
  faces: Face[];
  picks: MapPick[];
  selectedFaceId?: string | null;
  onSelectFace?: (faceId: string) => void;
  /** Extra padding (px) on the side the panel covers, so fitted bounds stay visible. */
  padding?: { top: number; right: number; bottom: number; left: number };
  className?: string;
  legend?: boolean;
}

export function PlanMap({ heat, faces, picks, selectedFaceId, onSelectFace, padding, className = "", legend = true }: PlanMapProps) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const onSelect = useRef(onSelectFace);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelect.current = onSelectFace;
  }, [onSelectFace]);

  // Build the map once per theme (the basemap style differs between day and night).
  useEffect(() => {
    let cancelled = false;
    const markerStore = markers.current;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      ml.setWorkerUrl(new URL(WORKER_URL, location.origin).href);
      const pickById = new Map(picks.map((p) => [p.faceId, p.rank]));
      const m = new ml.Map({
        container: box.current,
        style: basemap(theme),
        center: ATLANTA,
        zoom: 11.6,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.current = m;
      // Never fail silently: if the map hasn't loaded in 20 s, say so.
      const watchdog = setTimeout(() => {
        if (!cancelled && !m.loaded()) setFailed(true);
      }, 20000);
      m.once("load", () => clearTimeout(watchdog));
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", (e) => {
        if (!m.loaded() && String(e.error?.message ?? "").includes("style")) setFailed(true);
      });
      m.on("load", () => {
        if (cancelled) return;
        m.addSource("heat", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: heat.map((c) => ({ type: "Feature", properties: { a: c.affinity }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })),
          },
        });
        const ramp = heatRamp(theme);
        m.addLayer({
          id: "heat",
          type: "heatmap",
          source: "heat",
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "a"], 0, 0, 0.3, 0.02, 0.55, 0.25, 0.8, 0.7, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 12, 0.5, 14, 0.8],
            "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 10, 14, 12, 40, 14, 150],
            "heatmap-opacity": 0.95,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, ramp[0], 0.15, ramp[1], 0.35, ramp[2], 0.6, ramp[3], 0.85, ramp[4], 1, ramp[5]],
          },
        });
        const others = faces.filter((f) => !pickById.has(f.id));
        m.addSource("faces", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: others.map((f) => ({ type: "Feature", properties: { id: f.id }, geometry: { type: "Point", coordinates: [f.lng, f.lat] } })),
          },
        });
        m.addLayer({
          id: "faces",
          type: "circle",
          source: "faces",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 5],
            "circle-color": theme === "dark" ? "#d7d4cb" : "#22211d",
            "circle-stroke-color": theme === "dark" ? "#131210" : "#fbfaf7",
            "circle-stroke-width": 1.2,
          },
        });
        m.on("click", "faces", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") onSelect.current?.(id);
        });
        m.on("mouseenter", "faces", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "faces", () => (m.getCanvas().style.cursor = ""));

        const faceById = new Map(faces.map((f) => [f.id, f]));
        const bounds = new ml.LngLatBounds();
        for (const p of [...picks].sort((a, b) => b.rank - a.rank)) {
          const f = faceById.get(p.faceId);
          if (!f) continue;
          const el = shieldElement(p.rank, f, () => onSelect.current?.(f.id));
          const marker = new ml.Marker({ element: el, anchor: "bottom" }).setLngLat([f.lng, f.lat]).addTo(m);
          markerStore.set(f.id, { marker, el });
          bounds.extend([f.lng, f.lat]);
        }
        // Fit to the picks now and again whenever the box resizes, until the viewer moves the map themselves.
        let touched = false;
        m.on("dragstart", () => (touched = true));
        m.on("wheel", () => (touched = true));
        const fit = () => {
          m.resize();
          if (!touched && !bounds.isEmpty()) m.fitBounds(bounds, { padding: padding ?? 50, maxZoom: 13.4, duration: 0 });
        };
        fit();
        const ro = new ResizeObserver(fit);
        if (box.current) ro.observe(box.current);
        m.once("remove", () => ro.disconnect());
        setReady(true);
      });
    })().catch(() => setFailed(true));
    return () => {
      cancelled = true;
      markerStore.forEach(({ marker }) => marker.remove());
      markerStore.clear();
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
    // Data identity changes only when the plan changes; padding is read at fit time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, heat, faces, picks]);

  useEffect(() => {
    markers.current.forEach(({ el }, id) => updateShield(el, id === selectedFaceId));
    if (!ready || !selectedFaceId || !map.current) return;
    const entry = markers.current.get(selectedFaceId);
    if (!entry) return;
    const ll = entry.marker.getLngLat();
    const b = map.current.getBounds();
    if (!b.contains(ll)) map.current.easeTo({ center: ll, duration: 500 });
  }, [selectedFaceId, ready]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-panel ${className}`}>
      <div ref={box} className="!absolute inset-0" aria-label="Map of Atlanta: audience heat from yellow to red, picked faces as numbered green billboards" role="region" />
      {!ready && !failed ? <div aria-hidden className="skeleton absolute inset-0 !rounded-none opacity-60" /> : null}
      {failed ? (
        <div data-testid="map-failed" className="absolute inset-0 grid place-items-center p-6 text-center text-small text-muted">
          The map tiles did not load. The picks and numbers below are unaffected.
        </div>
      ) : null}
      {legend ? <MapLegend /> : null}
    </div>
  );
}
