import { IconArrowLeft, IconBuildingCommunity, IconCircleCheck, IconClock, IconMail, IconMapPin, IconPhone, IconUserCircle } from "@tabler/icons-react";
import { Link, useParams } from "react-router";

import { ReportCard } from "@/components/waste/ReportCard";
import { StatsCard } from "@/components/waste/StatsCard";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { formatCount, formatHours } from "@/lib/format";
import type { Authority, WasteReport } from "@/lib/waste";
import { getAuthority } from "@/services/authorities";
import { listReports } from "@/services/reports";

export function meta() {
  return [{ title: "Authority Profile · WasteWise AI" }];
}

export default function AuthorityProfileRoute() {
  const { id = "" } = useParams();
  const page = useServiceData(
    () => Promise.all([getAuthority(id), listReports()]).then(([authority, reports]) => ({ authority, reports })),
    [id],
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="min-h-11 -ml-3">
        <Link to="/authorities">
          <IconArrowLeft size={18} aria-hidden="true" />
          All authorities
        </Link>
      </Button>

      <AsyncContent loading={page.loading} error={page.error} onRetry={page.retry} skeleton={<LoadingState variant="detail" />}>
        {!page.data?.authority ? (
          <EmptyState title="Authority not found" description="This area may have been removed or renamed." />
        ) : (
          <AuthorityContent authority={page.data.authority} reports={page.data.reports.filter((report) => report.authorityId === id)} />
        )}
      </AsyncContent>
    </div>
  );
}

function AuthorityContent({ authority, reports }: { authority: Authority; reports: WasteReport[] }) {
  return (
    <>
      <Card className="flex flex-col gap-6 rounded-3xl border-border/70 p-6 shadow-sm sm:flex-row sm:items-center">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-accent text-brand">
          <IconUserCircle size={48} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            {authority.name}
            {authority.isActive ? null : <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Inactive</span>}
          </h1>
          <p className="text-muted-foreground">{authority.designation}</p>
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IconBuildingCommunity size={16} className="text-brand" aria-hidden="true" />
            {authority.ward} · {authority.area}
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/problems">View active problems</Link>
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatsCard label="Active Reports" value={formatCount(authority.activeReports)} icon={IconClock} tone="warning" />
        <StatsCard label="Resolved Reports" value={formatCount(authority.resolvedReports)} icon={IconCircleCheck} tone="success" />
        <StatsCard label="Average Resolution Time" value={formatHours(authority.averageResolutionHours)} icon={IconClock} tone="info" />
      </div>

      <Card className="grid gap-5 rounded-2xl border-border/70 p-5 shadow-sm sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <IconMapPin size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground">Official office address</p>
            <p className="font-medium text-foreground">{authority.officeAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <IconPhone size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground">Official phone</p>
            <p className="font-medium text-foreground">{authority.phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <IconMail size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Official email</p>
            <p className="truncate font-medium text-foreground">{authority.email}</p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="area-reports" className="space-y-4">
        <h2 id="area-reports" className="text-xl font-semibold text-foreground">
          Reports in This Area
        </h2>
        {reports.length === 0 ? (
          <EmptyState title="🎉 No active waste problems in this area." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} authorityName={authority.name} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
