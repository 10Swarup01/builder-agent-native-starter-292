import { IconBell, IconBellRinging } from "@tabler/icons-react";
import { useState } from "react";

import { FilterChips } from "@/components/waste/FilterChips";
import { NotificationRow } from "@/components/waste/NotificationDropdown";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { listNotifications } from "@/services/notifications";

export function meta() {
  return [{ title: "Notifications · WasteWise AI" }];
}

type Filter = "all" | "unread";

export default function NotificationsRoute() {
  const notifications = useServiceData(listNotifications);
  const [filter, setFilter] = useState<Filter>("all");
  const visible = (notifications.data ?? []).filter((item) => filter === "all" || !item.read);

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Updates on your reports and cases assigned to your area." icon={IconBell} />
      <FilterChips
        label="Notification filter"
        options={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <AsyncContent loading={notifications.loading} error={notifications.error} onRetry={notifications.retry} skeleton={<LoadingState />}>
        {visible.length === 0 ? (
          <EmptyState icon={IconBellRinging} title="You're all caught up" description="New updates about your reports will appear here." />
        ) : (
          <Card className="divide-y divide-border rounded-2xl border-border/70 p-2 shadow-sm">
            {visible.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </Card>
        )}
      </AsyncContent>
    </div>
  );
}
