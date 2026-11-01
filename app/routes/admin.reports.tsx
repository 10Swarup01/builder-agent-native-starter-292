import { IconBan, IconCircleCheck, IconEye, IconPencil, IconUserPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, SeverityBadge, StatusBadge } from "@/components/waste/badges";
import { ConfirmDialog } from "@/components/waste/ConfirmDialog";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { WastePhoto } from "@/components/waste/WastePhoto";
import { useServiceData } from "@/hooks/use-service-data";
import { formatDate } from "@/lib/format";
import { formatReportLocation, getCategory, type WasteReport } from "@/lib/waste";
import { listAuthorities } from "@/services/authorities";
import { listReports } from "@/services/reports";

export function meta() {
  return [{ title: "Reports · Admin · WasteWise AI" }];
}

type ActionKind = "assign" | "edit" | "resolve" | "reject";

const ACTION_COPY: Record<ActionKind, { title: string; description: string; confirmLabel: string; destructive?: boolean; icon: typeof IconEye }> = {
  assign: {
    title: "Assign authority",
    description: "Choose the authority responsible for this report.",
    confirmLabel: "Assign",
    icon: IconUserPlus,
  },
  edit: {
    title: "Edit report",
    description: "Corrections to category, location or details will be saved once the database is connected.",
    confirmLabel: "Save changes",
    icon: IconPencil,
  },
  resolve: {
    title: "Mark as resolved",
    description: "Confirm the cleanup is complete. Before and after photos will be required when this is connected.",
    confirmLabel: "Mark resolved",
    icon: IconCircleCheck,
  },
  reject: {
    title: "Reject report",
    description: "Rejected reports leave the active queue. A reason will be required when this is connected.",
    confirmLabel: "Reject report",
    destructive: true,
    icon: IconBan,
  },
};

const COLUMNS = ["Report ID", "Image", "Category", "Location", "Severity", "AI Confidence", "Authority", "Status", "Date", "Actions"];

export default function AdminReportsRoute() {
  const reports = useServiceData(listReports);
  const authorities = useServiceData(listAuthorities);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ kind: ActionKind; report: WasteReport } | null>(null);
  const [assignee, setAssignee] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (reports.data ?? []).filter((report) =>
      !term || [report.reportNumber, formatReportLocation(report.location), getCategory(report.category).label].join(" ").toLowerCase().includes(term),
    );
  }, [reports.data, query]);

  const authorityName = (id: string) => authorities.data?.find((authority) => authority.id === id)?.name ?? "Unassigned";

  const openAction = (kind: ActionKind, report: WasteReport) => {
    setAssignee(report.authorityId);
    setPending({ kind, report });
  };

  const confirmAction = () => {
    if (!pending) return;
    const copy = ACTION_COPY[pending.kind];
    toast.info(`${copy.confirmLabel} for ${pending.report.reportNumber} is a demo. Connect the backend to save it.`);
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Report Management" description="Review, assign and close reports across all wards." demo />

      <div className="max-w-md">
        <Label htmlFor="admin-report-search" className="sr-only">
          Search reports
        </Label>
        <Input
          id="admin-report-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by report ID, ward or category"
          className="min-h-11"
        />
      </div>

      <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry} skeleton={<LoadingState variant="detail" />}>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{report.reportNumber}</TableCell>
                  <TableCell>
                    <div className="size-12 overflow-hidden rounded-lg border border-border">
                      <WastePhoto category={report.category} src={report.imageUrl} alt={`Photo for ${report.reportNumber}`} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={report.category} />
                  </TableCell>
                  <TableCell className="max-w-48 text-sm">
                    {formatReportLocation(report.location)}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={report.severity} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">Not assessed</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">{authorityName(report.authorityId)}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(report.createdAt)}</TableCell>
                  <TableCell>
                    <ReportActions report={report} onAction={openAction} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {filtered.map((report) => (
            <Card key={report.id} className="space-y-3 rounded-2xl border-border/70 p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border">
                  <WastePhoto category={report.category} src={report.imageUrl} alt={`Photo for ${report.reportNumber}`} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-mono text-xs text-muted-foreground">{report.reportNumber}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <CategoryBadge category={report.category} />
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatReportLocation(report.location)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={report.severity} />
                <span className="text-xs text-muted-foreground">{authorityName(report.authorityId)}</span>
              </div>
              <ReportActions report={report} onAction={openAction} />
            </Card>
          ))}
        </div>
      </AsyncContent>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending ? ACTION_COPY[pending.kind].title : ""}
        description={pending ? `${ACTION_COPY[pending.kind].description} (${pending.report.reportNumber})` : ""}
        confirmLabel={pending ? ACTION_COPY[pending.kind].confirmLabel : "Confirm"}
        destructive={pending ? ACTION_COPY[pending.kind].destructive : false}
        onConfirm={confirmAction}
      >
        {pending?.kind === "assign" ? (
          <div className="space-y-2">
            <Label htmlFor="assign-authority">Responsible authority</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="assign-authority" className="min-h-12 w-full">
                <SelectValue placeholder="Select authority" />
              </SelectTrigger>
              <SelectContent>
                {(authorities.data ?? []).map((authority) => (
                  <SelectItem key={authority.id} value={authority.id}>
                    {authority.name} · {authority.ward}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function ReportActions({ report, onAction }: { report: WasteReport; onAction: (kind: ActionKind, report: WasteReport) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button asChild variant="outline" size="sm" className="min-h-9">
        <Link to={`/problems/${report.reportNumber}`} aria-label={`View ${report.reportNumber}`}>
          <IconEye size={15} aria-hidden="true" />
          View
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="min-h-9" aria-label={`Assign ${report.reportNumber}`} onClick={() => onAction("assign", report)}>
        <IconUserPlus size={15} aria-hidden="true" />
        Assign
      </Button>
      <Button variant="outline" size="sm" className="min-h-9" aria-label={`Edit ${report.reportNumber}`} onClick={() => onAction("edit", report)}>
        <IconPencil size={15} aria-hidden="true" />
        Edit
      </Button>
      <Button variant="outline" size="sm" className="min-h-9" aria-label={`Resolve ${report.reportNumber}`} onClick={() => onAction("resolve", report)}>
        <IconCircleCheck size={15} aria-hidden="true" />
        Resolve
      </Button>
      <Button variant="outline" size="sm" className="min-h-9 text-danger hover:text-danger" aria-label={`Reject ${report.reportNumber}`} onClick={() => onAction("reject", report)}>
        <IconBan size={15} aria-hidden="true" />
        Reject
      </Button>
    </div>
  );
}
