import { IconAlertTriangle, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { EmptyState, AsyncContent } from "@/components/waste/states";
import { FilterChips } from "@/components/waste/FilterChips";
import { PageHeader } from "@/components/waste/PageHeader";
import { ReportCard } from "@/components/waste/ReportCard";
import { Input } from "@/components/ui/input";
import { useServiceData } from "@/hooks/use-service-data";
import { getCategory, type ReportStatus, type Severity, type WasteCategoryId, type WasteReport } from "@/lib/waste";
import { listReports } from "@/services/reports";

export function meta() {
  return [{ title: "Active Problems · WasteWise AI" }];
}

type TypeFilter = "all" | "plastic" | "household" | "medical" | "chemical" | "liquid" | "ewaste" | "organic" | "other";
type StatusFilter = "all" | Exclude<ReportStatus, "resolved">;
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
  { value: "all", label: "All statuses" },
  { value: "reported", label: "Reported" },
  { value: "classified", label: "Classified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
];

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All severity" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const OTHER_CATEGORIES: WasteCategoryId[] = ["glass", "metal", "mixed"];

function matchesType(report: WasteReport, filter: TypeFilter) {
  if (filter === "all") return true;
  if (filter === "other") return OTHER_CATEGORIES.includes(report.category);
  return report.category === filter;
}

export default function ProblemsRoute() {
  const reports = useServiceData(listReports);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (reports.data ?? [])
      .filter((report) => report.status !== "resolved")
      .filter((report) => matchesType(report, type))
      .filter((report) => status === "all" || report.status === status)
      .filter((report) => severity === "all" || report.severity === severity)
      .filter((report) => {
        if (!term) return true;
        const haystack = [report.reportNumber, report.location.address, report.location.area, report.location.ward, getCategory(report.category).label]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
  }, [reports.data, query, type, status, severity]);

  return (
    <div>
      <PageHeader title="Active Waste Problems" description="Track reports that are waiting for classification, assignment or cleanup." icon={IconAlertTriangle} />

      <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="problem-search" className="sr-only">
            Search by Report ID, location or category
          </label>
          <Input
            id="problem-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Report ID, location or category"
            className="min-h-12 pl-10 text-base"
          />
        </div>
        <FilterChips label="Waste type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterChips label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <FilterChips label="Severity" options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
        </div>
      </div>

      <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry}>
        {filtered.length === 0 ? (
          <EmptyState title="No active waste problems right now." description="Try clearing a filter or searching a different area." />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {filtered.length} {filtered.length === 1 ? "problem" : "problems"}
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        )}
      </AsyncContent>
    </div>
  );
}
