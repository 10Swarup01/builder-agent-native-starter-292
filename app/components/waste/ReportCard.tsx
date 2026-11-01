import { IconArrowRight, IconMapPin } from "@tabler/icons-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { formatReportLocation, getCategory, type WasteReport } from "@/lib/waste";

import { CategoryBadge, SeverityBadge, StatusBadge } from "./badges";
import { WastePhoto } from "./WastePhoto";

interface ReportCardProps {
  report: WasteReport;
  authorityName?: string;
}

export function ReportCard({ report, authorityName }: ReportCardProps) {
  const category = getCategory(report.category);
  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border-border/70 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-muted">
        <WastePhoto category={report.category} src={report.imageUrl} alt={`${category.label} photo for report ${report.reportNumber}`} />
        <div className="absolute left-3 top-3">
          <CategoryBadge category={report.category} className="bg-card/95 shadow-sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} />
        </div>
        <h3 className="text-base font-semibold text-foreground">{category.label}</h3>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{formatReportLocation(report.location)}</span>
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Report ID</dt>
            <dd className="font-mono text-foreground">{report.reportNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reported</dt>
            <dd className="text-foreground">{formatDate(report.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Authority</dt>
            <dd className="truncate text-foreground">{authorityName ?? "Assignment pending"}</dd>
          </div>
        </dl>
        <Button asChild variant="outline" className="mt-auto min-h-11 w-full">
          <Link to={`/problems/${report.reportNumber}`} aria-label={`View details for report ${report.reportNumber}`}>
            View Details
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
