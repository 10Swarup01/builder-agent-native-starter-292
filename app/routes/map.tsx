import { IconAlertOctagon, IconAlertTriangle, IconCircleCheck, IconMap, IconPoint } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBadge, SeverityBadge, StatusBadge } from "@/components/waste/badges";
import { FilterChips } from "@/components/waste/FilterChips";
import { MapCanvas, type MapMarker } from "@/components/waste/MapCanvas";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import { formatDate } from "@/lib/format";
import { getCategory, type Severity, type WasteCategoryId, type WasteReport } from "@/lib/waste";
import { listReports } from "@/services/reports";

export function meta() {
  return [{ title: "Waste Map · WasteWise AI" }];
}

type TypeFilter = "all" | "plastic" | "household" | "medical" | "chemical" | "liquid" | "ewaste" | "organic" | "other";
type StatusFilter = "all" | "active" | "in_progress" | "resolved";
type SeverityFilter = "all" | Severity;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "plastic", label: "Plastic" },
  { value: "household", label: "Household" },
  { value: "medical", label: "Medical" },
  { value: "chemical", label: "Chemical" },
  { value: "liquid", label: "Liquid" },
  { value: "ewaste", label: "E-Waste" },
  { value: "organic", label: "Organic" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const OTHER_CATEGORIES: WasteCategoryId[] = ["glass", "metal", "mixed"];

function matches(report: WasteReport, type: TypeFilter, status: StatusFilter, severity: SeverityFilter, area: string) {
  const typeOk = type === "all" || (type === "other" ? OTHER_CATEGORIES.includes(report.category) : report.category === type);
  const statusOk =
    status === "all" ||
    (status === "active" && report.status !== "resolved") ||
    (status === "in_progress" && report.status === "in_progress") ||
    (status === "resolved" && report.status === "resolved");
  const severityOk = severity === "all" || report.severity === severity;
  const areaOk = area === "all" || report.location.ward === area;
  return typeOk && statusOk && severityOk && areaOk;
}

const WARDS = ["Demo Ward A", "Demo Ward B", "Demo Ward C", "Demo Ward D"];

export default function MapRoute() {
  const reports = useServiceData(listReports);
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [area, setArea] = useState("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const visible = useMemo(
    () => (reports.data ?? []).filter((report) => matches(report, type, status, severity, area)),
    [reports.data, type, status, severity, area],
  );

  const markers: MapMarker[] = visible.map((report) => ({
    id: report.id,
    label: `${getCategory(report.category).label} ${report.reportNumber}`,
    latitude: report.location.latitude,
    longitude: report.location.longitude,
    severity: report.severity,
    status: report.status,
  }));

  const selected = visible.find((report) => report.id === selectedId);

  return (
    <div className="space-y-5">
      <PageHeader title="Waste Management Map" description="See where reports are open, in progress or resolved across the city." icon={IconMap} demo />

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card className="space-y-4 rounded-2xl border-border/70 p-4 shadow-sm">
            <FilterChips label="Waste type" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <div className="grid gap-4 sm:grid-cols-3">
              <FilterChips label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
              <FilterChips label="Severity" options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
              <div className="space-y-2">
                <Label htmlFor="area-filter">Area</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger id="area-filter" className="min-h-10 w-full">
                    <SelectValue placeholder="All areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All areas</SelectItem>
                    {WARDS.map((ward) => (
                      <SelectItem key={ward} value={ward}>
                        {ward}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry} skeleton={<LoadingState variant="detail" />}>
            <MapCanvas
              className="h-[62vh] min-h-96 lg:h-[calc(100dvh-20rem)]"
              markers={markers}
              selectedId={selectedId}
              onSelectMarker={setSelectedId}
            />
          </AsyncContent>

          <Legend />
        </div>

        <aside aria-label="Selected report preview" className="xl:sticky xl:top-6 xl:self-start">
          {selected ? (
            <ReportPreview report={selected} onClose={() => setSelectedId(undefined)} />
          ) : (
            <Card className="flex flex-col items-center gap-3 rounded-2xl border-dashed p-8 text-center shadow-none">
              <IconMap size={32} className="text-brand" aria-hidden="true" />
              <p className="font-medium text-foreground">Select a marker</p>
              <p className="text-sm text-muted-foreground">Tap a pin on the map to preview the report.</p>
              <p className="text-xs text-muted-foreground">{visible.length} reports match these filters.</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { icon: IconAlertOctagon, label: "Critical", className: "bg-danger text-white" },
    { icon: IconAlertTriangle, label: "High priority", className: "bg-danger/85 text-white" },
    { icon: IconPoint, label: "Medium", className: "bg-warning text-foreground" },
    { icon: IconCircleCheck, label: "Resolved", className: "bg-success text-white" },
  ];
  return (
    <ul className="flex flex-wrap gap-2 text-sm" aria-label="Map legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className={`flex size-5 items-center justify-center rounded-full ${item.className}`}>
            <item.icon size={12} aria-hidden="true" />
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function ReportPreview({ report, onClose }: { report: WasteReport; onClose: () => void }) {
  return (
    <Card className="animate-fade-up space-y-4 rounded-2xl border-border/70 p-5 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-sm text-muted-foreground">{report.reportNumber}</p>
        <Button variant="ghost" size="sm" className="min-h-9" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <CategoryBadge category={report.category} />
        <SeverityBadge severity={report.severity} />
      </div>
      <StatusBadge status={report.status} />
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Location</dt>
          <dd className="text-foreground">{report.location.address}, {report.location.area}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Reported</dt>
          <dd className="text-foreground">{formatDate(report.createdAt)}</dd>
        </div>
      </dl>
      <Button asChild className="min-h-11 w-full">
        <Link to={`/problems/${report.reportNumber}`}>View details</Link>
      </Button>
    </Card>
  );
}
