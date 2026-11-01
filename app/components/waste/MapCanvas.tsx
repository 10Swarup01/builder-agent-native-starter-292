import { IconMapPin } from "@tabler/icons-react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";
import type { Severity, ReportStatus } from "@/lib/waste";

export interface MapMarker {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  severity: Severity | null;
  status: ReportStatus;
}

const BOUNDS = { minLat: 22.44, maxLat: 22.68, minLng: 88.22, maxLng: 88.46 };

export function toMapPercent(latitude: number, longitude: number) {
  const x = ((longitude - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - latitude) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x: Math.min(Math.max(x, 4), 96), y: Math.min(Math.max(y, 6), 94) };
}

function fromMapPercent(xPercent: number, yPercent: number) {
  return {
    latitude: BOUNDS.maxLat - (yPercent / 100) * (BOUNDS.maxLat - BOUNDS.minLat),
    longitude: BOUNDS.minLng + (xPercent / 100) * (BOUNDS.maxLng - BOUNDS.minLng),
  };
}

export function markerColor(severity: Severity | null, status: ReportStatus) {
  if (status === "resolved") return "bg-success text-white";
  if (severity === "critical") return "bg-danger text-white";
  if (severity === "high") return "bg-danger/85 text-white";
  if (severity === "medium") return "bg-warning text-foreground";
  return "bg-info text-white";
}

interface MapCanvasProps {
  markers: MapMarker[];
  selectedId?: string;
  onSelectMarker?: (id: string) => void;
  onPickPoint?: (point: { latitude: number; longitude: number }) => void;
  className?: string;
  compact?: boolean;
}

export function MapCanvas({ markers, selectedId, onSelectMarker, onPickPoint, className, compact = false }: MapCanvasProps) {
  const handlePick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onPickPoint) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    onPickPoint(fromMapPercent(xPercent, yPercent));
  };

  return (
    <div
      role="region"
      aria-label="Waste map placeholder"
      onClick={handlePick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/60 via-background to-muted",
        onPickPoint && "cursor-crosshair",
        className,
      )}
    >
      <svg className="absolute inset-0 size-full opacity-60" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0 30 C 25 25, 40 45, 60 35 S 90 20, 100 28" fill="none" strokeWidth="1.2" className="stroke-border" />
        <path d="M0 68 C 30 60, 50 80, 75 70 S 95 62, 100 66" fill="none" strokeWidth="1.2" className="stroke-border" />
        <path d="M22 0 C 28 30, 18 60, 30 100" fill="none" strokeWidth="1" strokeDasharray="2 2" className="stroke-border" />
        <path d="M70 0 C 62 40, 78 70, 66 100" fill="none" strokeWidth="1" strokeDasharray="2 2" className="stroke-border" />
        <rect x="42" y="44" width="16" height="10" rx="2" className="fill-muted stroke-border" strokeWidth="0.4" />
      </svg>
      <div className="absolute left-3 top-3 rounded-lg bg-card/95 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        Map placeholder — connect Google Maps or Mapbox
      </div>
      {markers.map((marker) => {
        const { x, y } = toMapPercent(marker.latitude, marker.longitude);
        const selected = marker.id === selectedId;
        return (
          <button
            key={marker.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectMarker?.(marker.id);
            }}
            aria-label={`${marker.label}, ${marker.severity} priority, ${marker.status.replace("_", " ")}`}
            aria-pressed={selected}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "z-10 scale-110" : "hover:scale-110",
            )}
          >
            <span className={cn("flex items-center justify-center rounded-full shadow-md ring-2 ring-card", compact ? "size-8" : "size-10", markerColor(marker.severity, marker.status))}>
              <IconMapPin size={compact ? 16 : 20} aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
