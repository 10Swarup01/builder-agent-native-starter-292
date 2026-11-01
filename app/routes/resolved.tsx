import { IconCircleCheck } from "@tabler/icons-react";

import { BeforeAfter } from "@/components/waste/BeforeAfter";
import { CategoryBadge } from "@/components/waste/badges";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { formatDate, formatHours } from "@/lib/format";
import { formatReportLocation } from "@/lib/waste";
import { listResolvedReports } from "@/services/reports";

export function meta() {
  return [{ title: "Resolved · WasteWise AI" }];
}

export default function ResolvedRoute() {
  const reports = useServiceData(listResolvedReports);

  return (
    <div>
      <PageHeader title="Resolved Waste Problems" description="Every cleared site comes with before and after proof from the responsible authority." icon={IconCircleCheck} />
      <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry} skeleton={<LoadingState variant="detail" />}>
        {reports.data && reports.data.length === 0 ? <EmptyState title="No resolved problems yet" description="Resolved reports will appear here with before and after photos." /> : null}
        <div className="grid gap-6 xl:grid-cols-2">
          {(reports.data ?? []).map((report) => {
            const resolutionHours = report.resolvedAt
              ? Math.round((new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime()) / 3600000)
              : null;
            return (
              <Card key={report.id} className="space-y-5 rounded-2xl border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CategoryBadge category={report.category} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs font-bold tracking-wide text-white">
                    <IconCircleCheck size={14} aria-hidden="true" />
                    RESOLVED
                  </span>
                </div>
                <BeforeAfter category={report.category} reportNumber={report.reportNumber} beforeSrc={report.imageUrl} afterSrc={report.afterImageUrl} />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd className="font-medium text-foreground">{formatReportLocation(report.location)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Report ID</dt>
                    <dd className="font-mono text-foreground">{report.reportNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Report date</dt>
                    <dd className="text-foreground">{formatDate(report.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Resolution date</dt>
                    <dd className="text-foreground">{report.resolvedAt ? formatDate(report.resolvedAt) : "Pending"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Resolution time</dt>
                    <dd className="text-foreground">{resolutionHours !== null ? formatHours(resolutionHours) : "Pending"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Responsible authority</dt>
                    <dd className="text-foreground">Assignment pending</dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      </AsyncContent>
    </div>
  );
}
