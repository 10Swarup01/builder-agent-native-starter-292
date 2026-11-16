import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_MAP_ZOOM,
  KOLKATA_CENTER,
  LOCATE_ZOOM,
  MAP_STYLE_URLS,
  MAPBOX_ACCESS_TOKEN,
  getMapboxConfigIssue,
  type MapStatus,
  type MapStyleMode,
} from "@/lib/mapbox";
import type { GeoPoint } from "@/services/maps";

export type MapboxModule = typeof import("mapbox-gl");

// mapbox-gl's typings leave out supported(), but the runtime module exports it.
type MapboxRuntime = MapboxModule & { supported: (failIfMajorPerformanceCaveat?: boolean) => boolean };

export interface MapFocus extends GeoPoint {
  zoom?: number;
}

interface UseMapboxMapOptions {
  styleMode: MapStyleMode;
  initialCenter?: GeoPoint;
  focus?: MapFocus | null;
  onStyleLoad?: (map: MapboxMap) => void;
}

export function useMapboxMap({ styleMode, initialCenter, focus, onStyleLoad }: UseMapboxMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => ({
    styleMode,
    center: initialCenter ?? KOLKATA_CENTER,
    zoom: initialCenter ? LOCATE_ZOOM : DEFAULT_MAP_ZOOM,
  }));
  const [instance, setInstance] = useState<{ map: MapboxMap; mapboxgl: MapboxModule } | null>(null);
  const [loadStatus, setLoadStatus] = useState<MapStatus>("loading");
  const configIssue = getMapboxConfigIssue();
  const appliedStyleRef = useRef(initial.styleMode);
  const onStyleLoadRef = useRef(onStyleLoad);

  useEffect(() => {
    onStyleLoadRef.current = onStyleLoad;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || configIssue) return;

    let disposed = false;
    let created: MapboxMap | undefined;

    void import("mapbox-gl")
      .then((imported) => {
        if (disposed) return;
        const mapboxgl = imported as MapboxRuntime;
        if (!mapboxgl.supported()) {
          setLoadStatus("webgl-unsupported");
          return;
        }
        const map = new mapboxgl.Map({
          container,
          accessToken: MAPBOX_ACCESS_TOKEN,
          style: MAP_STYLE_URLS[initial.styleMode],
          center: [initial.center.longitude, initial.center.latitude],
          zoom: initial.zoom,
        });
        created = map;
        map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
        map.on("style.load", () => onStyleLoadRef.current?.(map));
        let loaded = false;
        map.once("load", () => {
          loaded = true;
          setLoadStatus("ready");
        });
        map.on("error", (event) => {
          if (loaded) return;
          const httpStatus = (event.error as Error & { status?: number }).status;
          setLoadStatus(httpStatus === 401 || httpStatus === 403 ? "token-rejected" : "error");
        });
        setInstance({ map, mapboxgl });
      })
      .catch(() => {
        if (!disposed) setLoadStatus("error");
      });

    return () => {
      disposed = true;
      created?.remove();
      setInstance(null);
    };
  }, [initial, configIssue]);

  useEffect(() => {
    if (!instance || appliedStyleRef.current === styleMode) return;
    appliedStyleRef.current = styleMode;
    instance.map.setStyle(MAP_STYLE_URLS[styleMode]);
  }, [instance, styleMode]);

  useEffect(() => {
    if (!instance || !focus) return;
    instance.map.flyTo({ center: [focus.longitude, focus.latitude], zoom: focus.zoom ?? LOCATE_ZOOM });
  }, [instance, focus]);

  useEffect(() => {
    const container = containerRef.current;
    if (!instance || !container) return;
    const observer = new ResizeObserver(() => instance.map.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [instance]);

  const status: MapStatus = configIssue ?? loadStatus;

  return {
    containerRef,
    map: instance?.map ?? null,
    mapboxgl: instance?.mapboxgl ?? null,
    status,
  };
}

const STATUS_COPY: Record<Exclude<MapStatus, "ready">, { title: string; detail?: string }> = {
  loading: { title: "Loading map…" },
  error: {
    title: "The map could not be loaded",
    detail: "Check your connection, then reload the page. If it keeps failing, confirm the Mapbox token allows this site.",
  },
  "missing-token": {
    title: "Map is not configured",
    detail: "Set VITE_MAPBOX_ACCESS_TOKEN to a Mapbox public token (starts with pk.) and restart the app.",
  },
  "secret-token": {
    title: "Map token is not allowed in the browser",
    detail: "VITE_MAPBOX_ACCESS_TOKEN contains a secret token (sk.). Use a public token (pk.) instead.",
  },
  "token-rejected": {
    title: "Mapbox rejected the map token",
    detail: "The token is not allowed to load maps on this domain. Check its URL restrictions in the Mapbox account.",
  },
  "webgl-unsupported": {
    title: "This browser cannot display maps",
    detail: "Enable WebGL or hardware acceleration in your browser settings, then reload the page.",
  },
};

interface MapFrameProps {
  containerRef: RefObject<HTMLDivElement | null>;
  status: MapStatus;
  className?: string;
  children?: ReactNode;
}

export function MapFrame({ containerRef, status, className, children }: MapFrameProps) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-muted", className)}>
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {status !== "ready" ? <MapStatusOverlay status={status} /> : null}
      {children}
    </div>
  );
}

function MapStatusOverlay({ status }: { status: Exclude<MapStatus, "ready"> }) {
  const copy = STATUS_COPY[status];
  const loading = status === "loading";
  return (
    <div
      role={loading ? "status" : "alert"}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-muted/90 p-6 text-center"
    >
      {loading ? (
        <IconLoader2 size={28} className="animate-spin text-brand" aria-hidden="true" />
      ) : (
        <IconAlertTriangle size={28} className="text-warning" aria-hidden="true" />
      )}
      <p className="text-sm font-medium text-foreground">{copy.title}</p>
      {copy.detail ? <p className="max-w-sm text-xs text-muted-foreground">{copy.detail}</p> : null}
    </div>
  );
}

const STYLE_LABELS: Record<MapStyleMode, string> = { light: "Light", dark: "Dark" };

export function MapStyleToggle({ value, onChange }: { value: MapStyleMode; onChange: (mode: MapStyleMode) => void }) {
  return (
    <div role="group" aria-label="Map style" className="absolute bottom-3 left-3 z-10 flex overflow-hidden rounded-lg border border-border bg-card/95 shadow-sm">
      {(Object.keys(STYLE_LABELS) as MapStyleMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "min-h-9 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {STYLE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
