import { IconAlertTriangle, IconCircleCheck, IconClock, IconLayoutDashboard, IconSparkles, IconSum } from "@tabler/icons-react";
import { Link } from "react-router";

import { CategoryBadge, SeverityBadge, StatusBadge } from "@/components/waste/badges";
import { PageHeader } from "@/components/waste/PageHeader";
import { StatsCard } from "@/components/waste/StatsCard";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { formatCount, formatDate } from "@/lib/format";
import { getReportStats, listReports } from "@/services/reports";

export function meta() {
  return [{ title: "Admin Dashboard · WasteWise AI" }];
}

export default function AdminDashboardRoute() {
  const stats = useServiceData(getReportStats);
  const reports = useServiceData(listReports);
  const attention = (reports.data ?? []).filter((report) => report.status === "reported" || report.severity === "critical").slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Totals, assignments and resolutions across all wards." icon={IconLayoutDashboard} demo />

      <AsyncContent loading={stats.loading} error={stats.error} onRetry={stats.retry} skeleton={<LoadingState variant="stats" />}>
        {stats.data ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatsCard label="Total Reports" value={formatCount(stats.data.totalReports)} icon={IconSum} />
            <StatsCard label="Active" value={formatCount(stats.data.activeProblems)} icon={IconAlertTriangle} tone="warning" />
            <StatsCard label="In Progress" value={formatCount(stats.data.inProgress)} icon={IconClock} tone="info" />
            <StatsCard label="Resolved" value={formatCount(stats.data.resolved)} icon={IconCircleCheck} tone="success" />
          </div>
        ) : null}
      </AsyncContent>

      <section aria-labelledby="attention-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="attention-heading" className="text-lg font-semibold text-foreground">
            Needs attention
          </h2>
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/admin/reports">All reports</Link>
          </Button>
        </div>
        <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry}>
          <div className="grid gap-3 md:grid-cols-2">
            {attention.map((report) => (
              <Card key={report.id} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{report.reportNumber}</span>
                  <StatusBadge status={report.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <CategoryBadge category={report.category} />
                  <SeverityBadge severity={report.severity} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.location.address}, {report.location.ward} · {formatDate(report.createdAt)}
                </p>
              </Card>
            ))}
          </div>
        </AsyncContent>
      </section>

      <Card className="flex flex-col gap-3 rounded-2xl border-border/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-brand">
            <IconSparkles size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">AI classifications waiting for review</p>
            <p className="text-sm text-muted-foreground">Low-confidence results need a human decision.</p>
          </div>
        </div>
        <Button asChild className="min-h-11">
          <Link to="/admin/ai-review">Review now</Link>
        </Button>
      </Card>
    </div>
  );
}
