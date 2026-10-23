import { IconBell, IconBookmark, IconCamera, IconCircleCheck, IconClipboardList, IconLogout, IconMapPin, IconSettings, IconClock } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/waste/PageHeader";
import { ReportCard } from "@/components/waste/ReportCard";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { StatsCard } from "@/components/waste/StatsCard";
import { useServiceData } from "@/hooks/use-service-data";
import { DEMO_SAVED_LOCATIONS } from "@/lib/mock-data";
import { getCurrentUser } from "@/services/auth";
import { listAuthorities } from "@/services/authorities";
import { listReports } from "@/services/reports";

export function meta() {
  return [{ title: "My Profile · WasteWise AI" }];
}

export default function ProfileRoute() {
  const user = useServiceData(getCurrentUser);
  const reports = useServiceData(listReports);
  const authorities = useServiceData(listAuthorities);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" icon={IconClipboardList} />

      <AsyncContent loading={user.loading} error={user.error} onRetry={user.retry} skeleton={<LoadingState variant="stats" />}>
        {user.data ? (
          <>
            <Card className="flex flex-col items-center gap-5 rounded-3xl border-border/70 p-6 text-center shadow-sm sm:flex-row sm:text-left">
              <div className="relative">
                <span className="flex size-20 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-brand" aria-hidden="true">
                  {user.data.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-card text-brand shadow ring-1 ring-border" aria-hidden="true">
                  <IconCamera size={16} />
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-xl font-semibold text-foreground">{user.data.name}</h2>
                <p className="text-sm text-muted-foreground">{user.data.email}</p>
                <p className="text-sm text-muted-foreground">{user.data.phone}</p>
              </div>
              <Button variant="outline" className="min-h-11" onClick={() => toast.info("Profile photo upload will connect to Supabase Storage later.")}>
                Change photo
              </Button>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <StatsCard label="Submitted" value={String(user.data.reportsSubmitted)} icon={IconClipboardList} />
              <StatsCard label="Active" value={String(user.data.activeReports)} icon={IconClock} tone="warning" />
              <StatsCard label="Resolved" value={String(user.data.resolvedReports)} icon={IconCircleCheck} tone="success" />
            </div>
          </>
        ) : null}
      </AsyncContent>

      <section aria-labelledby="my-reports" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="my-reports" className="text-lg font-semibold text-foreground">
            My Reports
          </h2>
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/problems">View all</Link>
          </Button>
        </div>
        <AsyncContent loading={reports.loading} error={reports.error} onRetry={reports.retry} skeleton={<LoadingState />}>
          <div className="grid gap-4 md:grid-cols-2">
            {(reports.data ?? []).slice(0, 2).map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                authorityName={authorities.data?.find((authority) => authority.id === report.authorityId)?.name}
              />
            ))}
          </div>
        </AsyncContent>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="saved-locations" className="space-y-3">
          <h2 id="saved-locations" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <IconBookmark size={20} className="text-brand" aria-hidden="true" />
            Saved Locations
          </h2>
          <Card className="divide-y divide-border rounded-2xl border-border/70 shadow-sm">
            {DEMO_SAVED_LOCATIONS.map((location) => (
              <div key={location.id} className="flex items-center gap-3 p-4">
                <IconMapPin size={18} className="shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{location.label}</p>
                  <p className="truncate text-sm text-muted-foreground">{location.address}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="min-h-10">
                  <Link to="/report">Report here</Link>
                </Button>
              </div>
            ))}
          </Card>
        </section>

        <section aria-labelledby="notifications-settings" className="space-y-3">
          <h2 id="notifications-settings" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <IconBell size={20} className="text-brand" aria-hidden="true" />
            Notifications
          </h2>
          <Card className="divide-y divide-border rounded-2xl border-border/70 shadow-sm">
            <div className="flex items-center justify-between gap-4 p-4">
              <Label htmlFor="push-alerts" className="text-sm font-medium">
                Status change alerts
              </Label>
              <Switch id="push-alerts" checked={pushAlerts} onCheckedChange={setPushAlerts} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <Label htmlFor="email-updates" className="text-sm font-medium">
                Email updates
              </Label>
              <Switch id="email-updates" checked={emailUpdates} onCheckedChange={setEmailUpdates} />
            </div>
          </Card>
        </section>
      </div>

      <section aria-labelledby="account-settings" className="space-y-3">
        <h2 id="account-settings" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <IconSettings size={20} className="text-brand" aria-hidden="true" />
          Account Settings
        </h2>
        <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Name</Label>
              <Input id="account-name" defaultValue={user.data?.name ?? ""} className="min-h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-phone">Phone</Label>
              <Input id="account-phone" defaultValue={user.data?.phone ?? ""} className="min-h-11" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="min-h-11" onClick={() => toast.success("Changes saved locally. Account saving will connect to Supabase Auth later.")}>
              Save changes
            </Button>
          </div>
        </Card>
      </section>

      <Button variant="outline" className="min-h-12 w-full text-danger hover:text-danger sm:w-auto" onClick={() => toast.info("Sign out will connect to Supabase Auth later.")}>
        <IconLogout size={18} aria-hidden="true" />
        Logout
      </Button>
    </div>
  );
}
