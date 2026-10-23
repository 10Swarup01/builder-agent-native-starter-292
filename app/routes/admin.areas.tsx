import { IconMapSearch } from "@tabler/icons-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import { formatCount, formatHours } from "@/lib/format";
import { listAuthorities } from "@/services/authorities";

export function meta() {
  return [{ title: "Areas & Wards · Admin · WasteWise AI" }];
}

export default function AdminAreasRoute() {
  const authorities = useServiceData(listAuthorities);

  return (
    <div className="space-y-6">
      <PageHeader title="Areas / Wards" description="Coverage, responsible authority and workload for each ward." icon={IconMapSearch} demo />
      <AsyncContent loading={authorities.loading} error={authorities.error} onRetry={authorities.retry} skeleton={<LoadingState variant="detail" />}>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Responsible authority</TableHead>
                <TableHead className="text-right">Active reports</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
                <TableHead className="text-right">Avg. resolution</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(authorities.data ?? []).map((authority) => (
                <TableRow key={authority.id}>
                  <TableCell className="font-medium">{authority.ward}</TableCell>
                  <TableCell>{authority.area}</TableCell>
                  <TableCell>{authority.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(authority.activeReports)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(authority.resolvedReports)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHours(authority.averageResolutionHours)}</TableCell>
                  <TableCell>{authority.isActive ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {(authorities.data ?? []).map((authority) => (
            <Card key={authority.id} className="space-y-2 rounded-2xl border-border/70 p-4 shadow-sm">
              <p className="font-medium">{authority.ward}</p>
              <p className="text-sm text-muted-foreground">{authority.area} · {authority.name}</p>
              <dl className="grid grid-cols-3 gap-2 pt-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Active</dt>
                  <dd className="font-medium">{formatCount(authority.activeReports)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Resolved</dt>
                  <dd className="font-medium">{formatCount(authority.resolvedReports)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Avg.</dt>
                  <dd className="font-medium">{formatHours(authority.averageResolutionHours)}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </AsyncContent>
    </div>
  );
}
