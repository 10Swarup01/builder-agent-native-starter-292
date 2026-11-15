import { IconCurrentLocation, IconMap } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddressSearch } from "@/components/waste/AddressSearch";
import { FilterChips } from "@/components/waste/FilterChips";
import type { MapFocus } from "@/components/waste/MapCanvas";
import { PageHeader } from "@/components/waste/PageHeader";
import { MapLegend, WasteMap } from "@/components/waste/WasteMap";
import { useServiceData } from "@/hooks/use-service-data";
import { ADDRESS_ZOOM, LOCATE_ZOOM } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import type { ReportStatus, WasteCategoryId } from "@/lib/waste";
import { getCurrentPosition, getGeolocationAccess, type PlaceResult } from "@/services/maps";
import { listMapReports, type MapReport } from "@/services/reports";

export function meta() {
  return [{ title: "Waste Map · WasteWise AI" }];
}

type StatusFilter = "all" | "active" | "resolved";
type CategoryFilter = "all" | Exclude<WasteCategoryId, "liquid">;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All reports" },
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All waste" },
  { value: "plastic", label: "Plastic" },
  { value: "household", label: "Household" },
  { value: "medical", label: "Medical" },
  { value: "chemical", label: "Chemical" },
  { value: "glass", label: "Glass" },
  { value: "metal", label: "Metal" },
  { value: "ewaste", label: "E-Waste" },
  { value: "organic", label: "Organic" },
  { value: "mixed", label: "Mixed / Unknown" },
];

const ACTIVE_STATUSES: ReportStatus[] = ["reported", "classified", "assigned", "in_progress"];

function matchesFilters(report: MapReport, status: StatusFilter, category: CategoryFilter) {
  const statusOk =
    status === "all" || (status === "resolved" ? report.status === "resolved" : ACTIVE_STATUSES.includes(report.status));
  const categoryOk = category === "all" || report.category === category;
  return statusOk && categoryOk;
}

export default function MapRoute() {
  const navigate = useNavigate();
  const reports = useServiceData(listMapReports);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const visible = useMemo(
    () => (reports.data ?? []).filter((report) => matchesFilters(report, status, category)),
    [reports.data, status, category],
  );

  const locate = useCallback(async () => {
    setLocateError(null);
    setLocating(true);
    try {
      const point = await getCurrentPosition();
      setFocus({ ...point, zoom: LOCATE_ZOOM });
    } catch (caught) {
      setLocateError(caught instanceof Error ? caught.message : "Could not read your location.");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void getGeolocationAccess().then((access) => {
      if (access === "granted") void locate();
    });
  }, [locate]);

  const openReport = useCallback(
    (reportNumber: string) => {
      navigate(`/problems/${reportNumber}`);
    },
    [navigate],
  );

  const selectPlace = (place: PlaceResult) => {
    setFocus({ latitude: place.latitude, longitude: place.longitude, zoom: ADDRESS_ZOOM });
  };

  const total = reports.data?.length ?? 0;
  const summary =
    reports.data === undefined
      ? ""
      : total === 0
        ? "No reports with a map location yet."
        : visible.length === 0
          ? "No reports match these filters."
          : `Showing ${visible.length} of ${total} reports.`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Waste Management Map"
        description="Reports are plotted where they were submitted. Zoom in to separate nearby reports."
        icon={IconMap}
      />

      <Card className="space-y-4 rounded-2xl border-border/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <AddressSearch id="map-search" onSelect={selectPlace} className="min-w-0 flex-1" placeholder="Search an address or place in India" />
          <Button variant="outline" className="min-h-12 shrink-0" onClick={() => void locate()} disabled={locating}>
            <IconCurrentLocation size={18} aria-hidden="true" />
            {locating ? "Locating..." : "Current location"}
          </Button>
        </div>
        {locateError ? (
          <p role="alert" className="text-sm text-danger">
            {locateError}
          </p>
        ) : null}
        <FilterChips label="Report status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <FilterChips label="Waste type" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </Card>

      <div className="relative">
        <WasteMap
          className="h-[62vh] min-h-96 lg:h-[calc(100dvh-24rem)]"
          reports={visible}
          focus={focus}
          onViewReport={openReport}
        />
        {reports.loading ? <MapNotice>Loading reports…</MapNotice> : null}
        {reports.error ? (
          <MapNotice tone="error">
            <span>Could not load reports.</span>
            <Button variant="outline" className="min-h-9" onClick={reports.retry}>
              Try again
            </Button>
          </MapNotice>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MapLegend />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {summary}
        </p>
      </div>
    </div>
  );
}

function MapNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "absolute left-1/2 top-3 z-20 flex w-max max-w-[90%] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm shadow-md",
        tone === "error" ? "border-danger/30 text-danger" : "border-border text-foreground",
      )}
    >
      {children}
    </div>
  );
}
