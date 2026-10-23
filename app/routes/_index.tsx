import { IconAlertTriangle, IconCamera, IconChartBar, IconCircleCheck, IconMap, IconSum } from "@tabler/icons-react";
import { Link } from "react-router";

import { ReportCard } from "@/components/waste/ReportCard";
import { ChartCard, BarList } from "@/components/waste/charts";
import { StatsCard } from "@/components/waste/StatsCard";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { Button } from "@/components/ui/button";
import { useServiceData } from "@/hooks/use-service-data";
import { formatCount } from "@/lib/format";
import { APP_TAGLINE, APP_TITLE } from "@/lib/app-config";
import { getAnalytics } from "@/services/analytics";
import { listAuthorities } from "@/services/authorities";
import { listReports } from "@/services/reports";

export function meta() {
  return [
    { title: APP_TITLE },
    { name: "description", content: "Report illegally dumped waste. AI identifies the waste type and routes it to the right authority." },
  ];
}

export default function HomeRoute() {
  const analytics = useServiceData(getAnalytics);
  const reports = useServiceData(listReports);
  const authorities = useServiceData(listAuthorities);

  const recent = [...(reports.data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand via-brand to-brand-fresh/80 p-6 text-brand-foreground shadow-lg sm:p-10">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" aria-hidden="true" />
        <div className="relative max-w-2xl space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-brand-foreground/80">
            <IconCircleCheck size={18} aria-hidden="true" />
            {APP_TITLE}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
          <p className="max-w-xl text-base leading-relaxed text-brand-foreground/90 sm:text-lg">
            Help keep your surroundings clean by reporting illegally dumped or unmanaged waste. Our AI helps identify the waste type and route the problem to the appropriate authority.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg" className="min-h-14 bg-white text-brand hover:bg-white/90 hover:text-brand">
              <Link to="/report">
                <IconCamera size={22} aria-hidden="true" />
                Report Garbage
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-14 border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link to="/map">
                <IconMap size={22} aria-hidden="true" />
                View Waste Map
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="stats-heading" className="space-y-3">
        <h2 id="stats-heading" className="sr-only">
          Key statistics
        </h2>
        <AsyncContent loading={analytics.loading} error={analytics.error} onRetry={analytics.retry} skeleton={<LoadingState variant="stats" />}>
          {analytics.data ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatsCard label="Total Reports" value={formatCount(analytics.data.stats.totalReports)} icon={IconSum} hint="Demo value" />
              <StatsCard label="Active Problems" value={formatCount(analytics.data.stats.activeProblems)} icon={IconAlertTriangle} tone="warning" hint="Demo value" />
              <StatsCard label="Resolved" value={formatCount(analytics.data.stats.resolved)} icon={IconCircleCheck} tone="success" hint="Demo value" />
              <StatsCard label="Resolution Rate" value={`${analytics.data.stats.resolutionRate}%`} icon={IconChartBar} tone="info" hint="Demo value" />
            </div>
          ) : null}
        </AsyncContent>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-heading" className="text-xl font-semibold text-foreground">
            Recent Waste Reports
          </h2>
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/problems">View all</Link>
          </Button>
        </div>
        <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                authorityName={authorities.data?.find((authority) => authority.id === report.authorityId)?.name}
              />
            ))}
          </div>
        </AsyncContent>
      </section>

      <section aria-labelledby="category-heading" className="space-y-4">
        <h2 id="category-heading" className="text-xl font-semibold text-foreground">
          Waste Category Summary
        </h2>
        <AsyncContent loading={analytics.loading} error={analytics.error} onRetry={analytics.retry} skeleton={<LoadingState variant="detail" />}>
          {analytics.data ? (
            <ChartCard title="Reports by waste type" description="Demo values across the ten supported categories.">
              <BarList data={analytics.data.wasteByCategory} barClassName="bg-chart-1" />
            </ChartCard>
          ) : null}
        </AsyncContent>
      </section>
    </div>
  );
}
