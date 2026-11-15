import type { GeoJSONSource, Map as MapboxMap, MapMouseEvent, Popup } from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type MapStyleMode } from "@/lib/mapbox";
import { formatDate } from "@/lib/format";
import { getCategory, SEVERITY_META, type ReportStatus } from "@/lib/waste";
import { getReportPhotoUrl } from "@/services/report-images";
import type { MapReport } from "@/services/reports";

import { MapFrame, MapStyleToggle, useMapboxMap, type MapFocus } from "./MapCanvas";

const REPORTS_SOURCE = "waste-reports";
const CLUSTER_LAYER = "waste-clusters";
const CLUSTER_COUNT_LAYER = "waste-cluster-count";
const POINT_LAYER = "waste-points";
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS = 48;

const MAP_STATUS_STYLE: Record<ReportStatus, { color: string; label: string }> = {
  reported: { color: "#dc2626", label: "Reported" },
  classified: { color: "#ea580c", label: "Under review" },
  assigned: { color: "#2563eb", label: "Assigned" },
  in_progress: { color: "#2563eb", label: "In progress" },
  resolved: { color: "#16a34a", label: "Resolved" },
  rejected: { color: "#6b7280", label: "Rejected" },
};

const CLUSTER_COLOR = "#1e5e3f";

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: "Reported", color: MAP_STATUS_STYLE.reported.color },
  { label: "Under review", color: MAP_STATUS_STYLE.classified.color },
  { label: "Assigned / in progress", color: MAP_STATUS_STYLE.assigned.color },
  { label: "Resolved", color: MAP_STATUS_STYLE.resolved.color },
  { label: "Rejected", color: MAP_STATUS_STYLE.rejected.color },
];

export function MapLegend() {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap gap-2 text-sm">
      {LEGEND_ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="size-3 rounded-full ring-2 ring-card" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ReportFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: string; status: ReportStatus; color: string };
}

interface ReportCollection {
  type: "FeatureCollection";
  features: ReportFeature[];
}

function toReportCollection(reports: MapReport[]): ReportCollection {
  return {
    type: "FeatureCollection",
    features: reports.map(
      (report): ReportFeature => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [report.longitude, report.latitude] },
        properties: { id: report.id, status: report.status, color: MAP_STATUS_STYLE[report.status].color },
      }),
    ),
  };
}

function ensureReportLayers(map: MapboxMap, data: ReportCollection) {
  if (!map.getSource(REPORTS_SOURCE)) {
    map.addSource(REPORTS_SOURCE, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });
  }
  if (!map.getLayer(CLUSTER_LAYER)) {
    map.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: REPORTS_SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": CLUSTER_COLOR,
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 28],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(CLUSTER_COUNT_LAYER)) {
    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: REPORTS_SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 13,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });
  }
  if (!map.getLayer(POINT_LAYER)) {
    map.addLayer({
      id: POINT_LAYER,
      type: "circle",
      source: REPORTS_SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
}

interface RenderedFeature {
  properties?: Record<string, unknown> | null;
  geometry?: { type: string; coordinates?: unknown };
}

// mapbox-gl's declarations reference the GeoJSON namespace, which TypeScript 7 does not resolve here.
function renderedFeatures(map: MapboxMap, event: MapMouseEvent, layer: string): RenderedFeature[] {
  return map.queryRenderedFeatures(event.point, { layers: [layer] }) as unknown as RenderedFeature[];
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadPopupPhoto(slot: HTMLElement, report: MapReport) {
  if (!report.photoPath) return;
  const url = await getReportPhotoUrl(report.photoPath).catch(() => null);
  if (!url) {
    slot.textContent = "Photo not available";
    return;
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = `Photo for report ${report.reportNumber}`;
  image.className = "h-full w-full object-cover";
  slot.replaceChildren(image);
}

function buildReportPopup(report: MapReport, onViewReport: (reportNumber: string) => void): HTMLElement {
  const status = MAP_STATUS_STYLE[report.status];
  const root = element("div", "w-60 space-y-2 text-neutral-900");

  const header = element("div", "flex items-center justify-between gap-2");
  const badge = element("span", "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 px-2 py-0.5 text-xs font-medium");
  const dot = element("span", "size-2 rounded-full");
  dot.style.backgroundColor = status.color;
  badge.append(dot, status.label);
  header.append(element("span", "font-mono text-xs text-neutral-500", report.reportNumber), badge);

  const photo = element(
    "div",
    "flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-neutral-100 text-xs text-neutral-500",
    report.photoPath ? "Loading photo…" : "No photo on file",
  );
  const track = element("button", "min-h-10 w-full rounded-md bg-emerald-800 px-3 text-sm font-medium text-white hover:bg-emerald-900", "Track report");
  track.type = "button";
  track.addEventListener("click", () => onViewReport(report.reportNumber));

  root.append(
    header,
    element("p", "text-sm font-semibold", getCategory(report.category).label),
    element("p", "text-xs text-neutral-600", report.severity ? `${SEVERITY_META[report.severity].label} priority` : "Severity not assessed"),
    element("p", "text-xs text-neutral-700", report.address || "Address not provided"),
    element("p", "text-xs text-neutral-500", `Submitted ${formatDate(report.createdAt)}`),
    photo,
    track,
  );
  void loadPopupPhoto(photo, report);
  return root;
}

interface WasteMapProps {
  reports: MapReport[];
  focus: MapFocus | null;
  onViewReport: (reportNumber: string) => void;
  className?: string;
}

export function WasteMap({ reports, focus, onViewReport, className }: WasteMapProps) {
  const [styleMode, setStyleMode] = useState<MapStyleMode>("light");
  const collection = useMemo(() => toReportCollection(reports), [reports]);
  const reportsById = useMemo(() => new Map(reports.map((report): [string, MapReport] => [report.id, report])), [reports]);
  const latest = useRef({ collection, reportsById, onViewReport });

  useEffect(() => {
    latest.current = { collection, reportsById, onViewReport };
  }, [collection, reportsById, onViewReport]);

  const handleStyleLoad = useCallback((map: MapboxMap) => ensureReportLayers(map, latest.current.collection), []);
  const { containerRef, map, mapboxgl, status } = useMapboxMap({ styleMode, focus, onStyleLoad: handleStyleLoad });

  useEffect(() => {
    map?.getSource<GeoJSONSource>(REPORTS_SOURCE)?.setData(collection);
  }, [map, collection]);

  useEffect(() => {
    if (!map || !mapboxgl) return;
    let popup: Popup | undefined;

    const onClusterClick = (event: MapMouseEvent) => {
      const [cluster] = renderedFeatures(map, event, CLUSTER_LAYER);
      const clusterId = cluster?.properties?.cluster_id;
      const source = map.getSource<GeoJSONSource>(REPORTS_SOURCE);
      if (typeof clusterId !== "number" || !source || cluster?.geometry?.type !== "Point") return;
      const center = cluster.geometry.coordinates as [number, number];
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || zoom == null) return;
        map.easeTo({ center, zoom });
      });
    };

    const onPointClick = (event: MapMouseEvent) => {
      const [feature] = renderedFeatures(map, event, POINT_LAYER);
      const id = feature?.properties?.id;
      const report = typeof id === "string" ? latest.current.reportsById.get(id) : undefined;
      if (!report) return;
      popup?.remove();
      popup = new mapboxgl.Popup({ offset: 14, maxWidth: "300px" })
        .setLngLat([report.longitude, report.latitude])
        .setDOMContent(buildReportPopup(report, latest.current.onViewReport))
        .addTo(map);
    };

    const showPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", CLUSTER_LAYER, onClusterClick);
    map.on("click", POINT_LAYER, onPointClick);
    map.on("mouseenter", CLUSTER_LAYER, showPointer);
    map.on("mouseenter", POINT_LAYER, showPointer);
    map.on("mouseleave", CLUSTER_LAYER, clearPointer);
    map.on("mouseleave", POINT_LAYER, clearPointer);

    return () => {
      popup?.remove();
      map.off("click", CLUSTER_LAYER, onClusterClick);
      map.off("click", POINT_LAYER, onPointClick);
      map.off("mouseenter", CLUSTER_LAYER, showPointer);
      map.off("mouseenter", POINT_LAYER, showPointer);
      map.off("mouseleave", CLUSTER_LAYER, clearPointer);
      map.off("mouseleave", POINT_LAYER, clearPointer);
    };
  }, [map, mapboxgl]);

  return (
    <MapFrame containerRef={containerRef} status={status} className={className}>
      <MapStyleToggle value={styleMode} onChange={setStyleMode} />
    </MapFrame>
  );
}
