import { IconAlertTriangle, IconChartBar, IconCircleCheck, IconClock, IconMapPin, IconRecycle, IconSum } from "@tabler/icons-react";

import { useServiceData } from "@/hooks/use-service-data";
import { formatCount, formatHours } from "@/lib/format";
import { getAnalytics, type AnalyticsSnapshot } from "@/services/analytics";

import { AsyncContent, LoadingState } from "./states";
import { BarList, ChartCard, ColumnChart, LineChart, RingGauge } from "./charts";
import { StatsCard } from "./StatsCard";

export function AnalyticsView() {
  const { data, error, loading, retry } = useServiceData(getAnalytics);
  return (
    <AsyncContent loading={loading} error={error} onRetry={retry} skeleton={<LoadingState variant="stats" />}>
      {data ? <AnalyticsContent data={data} /> : null}
    </AsyncContent>
  );
}

function AnalyticsContent({ data }: { data: AnalyticsSnapshot }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard label="Total Reports" value={formatCount(data.stats.totalReports)} icon={IconSum} />
        <StatsCard label="Resolved" value={formatCount(data.stats.resolved)} icon={IconCircleCheck} tone="success" />
        <StatsCard label="Active" value={formatCount(data.stats.activeProblems)} icon={IconAlertTriangle} tone="warning" />
        <StatsCard label="Average Resolution Time" value={formatHours(data.averageResolutionHours)} icon={IconClock} tone="info" />
        <StatsCard label="Most Reported Category" value={data.mostReportedCategory} icon={IconRecycle} />
        <StatsCard label="Most Problematic Area" value={data.mostProblematicArea} icon={IconMapPin} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Waste by Category" description="Reports grouped by AI-confirmed category.">
          <BarList data={data.wasteByCategory} barClassName="bg-chart-1" />
        </ChartCard>
        <ChartCard title="Reports by Area" description="Total reports per ward.">
          <BarList data={data.reportsByArea} barClassName="bg-chart-4" />
        </ChartCard>
        <ChartCard title="Monthly Reports" description="New reports submitted each month.">
          <ColumnChart data={data.monthlyReports} barClassName="bg-chart-2" />
        </ChartCard>
        <ChartCard title="Resolution Rate" description="Share of reports resolved, by month.">
          <div className="space-y-6">
            <RingGauge percent={data.stats.resolutionRate} label="Overall resolution rate" />
            <LineChart data={data.resolutionRateTrend} suffix="%" />
          </div>
        </ChartCard>
        <ChartCard title="Average Resolution Time" description="Hours from submission to resolution, by month." className="lg:col-span-2">
          <LineChart data={data.resolutionTimeTrend} suffix="h" />
        </ChartCard>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <IconChartBar size={14} aria-hidden="true" />
        Chart values are demo data served by the analytics service placeholder.
      </p>
    </div>
  );
}
