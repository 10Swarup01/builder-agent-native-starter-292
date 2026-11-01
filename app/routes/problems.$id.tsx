import { IconArrowLeft, IconMapPin } from "@tabler/icons-react";
import { Link, useParams } from "react-router";

import { CategoryBadge, SeverityBadge, StatusBadge } from "@/components/waste/badges";
import { ReportTimeline, buildReportTimeline } from "@/components/waste/ReportTimeline";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { WastePhoto } from "@/components/waste/WastePhoto";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { formatDate, formatTime } from "@/lib/format";
import { formatReportLocation, getCategory, type WasteReport } from "@/lib/waste";
import { getReport } from "@/services/reports";

export function meta() {
  return [{ title: "Report Details · WasteWise AI" }];
}

export default function ProblemDetailRoute() {
  const { id = "" } = useParams();
  const report = useServiceData(() => getReport(id), [id]);

  return (
    <AsyncContent loading={report.loading} error={report.error} onRetry={report.retry} skeleton={<LoadingState variant="detail" />}>
      {!report.data ? (
        <EmptyState
          title="Report not found"
          description={`We could not find a report with ID ${id}.`}
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/problems">Back to active problems</Link>
            </Button>
          }
        />
      ) : (
        <ReportDetail report={report.data} />
      )}
    </AsyncContent>
  );
}

function ReportDetail({ report }: { report: WasteReport }) {
  const category = getCategory(report.category);
  const CategoryIcon = category.icon;
  const items: { label: string; value: React.ReactNode }[] = [
    { label: "Waste Type", value: category.label },
    { label: "Severity", value: <SeverityBadge severity={report.severity} /> },
    { label: "Location", value: formatReportLocation(report.location) },
    { label: "Reported", value: `${formatDate(report.createdAt)} · ${formatTime(report.createdAt)}` },
    { label: "Authority", value: "Assignment pending" },
    { label: "Status", value: <StatusBadge status={report.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-sm text-muted-foreground">{report.reportNumber}</p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            <CategoryIcon size={26} className="text-brand" aria-hidden="true" />
            Report #{report.reportNumber}
          </h1>
        </div>
        <Button asChild variant="ghost" className="min-h-11 self-start">
          <Link to="/problems">
            <IconArrowLeft size={18} aria-hidden="true" />
            Back to problems
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
            <WastePhoto category={report.category} src={report.imageUrl} alt={`${category.label} for report ${report.reportNumber}`} />
          </div>
          <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Description</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.description || "No description was added."}</p>
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category={report.category} />
              {report.blockingTraffic ? <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">Blocking traffic</span> : null}
            </div>
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link to="/map">
                <IconMapPin size={18} aria-hidden="true" />
                View on Map
              </Link>
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <dl className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.label} className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="text-sm font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-foreground">Report Timeline</h2>
            <ReportTimeline events={buildReportTimeline(report)} />
          </Card>
        </div>
      </div>
    </div>
  );
}
