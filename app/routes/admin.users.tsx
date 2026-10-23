import { IconUsers } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import { listUsers } from "@/services/auth";
import { cn } from "@/lib/utils";

export function meta() {
  return [{ title: "Users · Admin · WasteWise AI" }];
}

export default function AdminUsersRoute() {
  const users = useServiceData(listUsers);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Citizens, authority users and admins." icon={IconUsers} demo />
      <AsyncContent loading={users.loading} error={users.error} onRetry={users.retry} skeleton={<LoadingState variant="detail" />}>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users.data ?? []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    <StatusText active={user.status === "active"} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{user.reports}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => toast.info(`Demo: ${user.status === "active" ? "suspend" : "activate"} will connect to Supabase Auth.`)}>
                      {user.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {(users.data ?? []).map((user) => (
            <Card key={user.id} className="space-y-3 rounded-2xl border-border/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <StatusText active={user.status === "active"} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{user.role} · {user.reports} reports</span>
                <Button variant="outline" size="sm" className="min-h-10" onClick={() => toast.info(`Demo: ${user.status === "active" ? "suspend" : "activate"} will connect to Supabase Auth.`)}>
                  {user.status === "active" ? "Suspend" : "Activate"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </AsyncContent>
    </div>
  );
}

function StatusText({ active }: { active: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", active ? "text-success" : "text-danger")}>
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {active ? "Active" : "Suspended"}
    </span>
  );
}
