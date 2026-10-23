import { IconAlertTriangle, IconBell, IconBuildingCommunity, IconCircleCheck, IconRefresh, IconRobot, IconSend } from "@tabler/icons-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { listNotifications, type AppNotification, type NotificationType } from "@/services/notifications";

import { useServiceData } from "@/hooks/use-service-data";

const NOTIFICATION_ICON: Record<NotificationType, typeof IconBell> = {
  submitted: IconSend,
  assigned: IconBuildingCommunity,
  status: IconRefresh,
  resolved: IconCircleCheck,
  ai_review: IconRobot,
};

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = NOTIFICATION_ICON[type];
  const warn = type === "ai_review";
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", warn ? "bg-warning/15 text-warning" : "bg-accent text-brand")}>
      {warn ? <IconAlertTriangle size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
    </span>
  );
}

export function NotificationRow({ notification }: { notification: AppNotification }) {
  return (
    <Link to={notification.href} className="flex gap-3 rounded-xl p-3 transition hover:bg-muted">
      <NotificationIcon type={notification.type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{notification.title}</span>
          {!notification.read ? <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold uppercase text-brand-foreground">New</span> : null}
        </span>
        <span className="block text-sm text-muted-foreground">{notification.body}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{notification.time}</span>
      </span>
    </Link>
  );
}

export function NotificationDropdown() {
  const { data, loading } = useServiceData(listNotifications);
  const unread = data?.filter((notification) => !notification.read).length ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-11" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <IconBell size={22} aria-hidden="true" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading notifications...</p> : null}
        {(data ?? []).slice(0, 4).map((notification) => (
          <DropdownMenuItem key={notification.id} asChild className="p-0">
            <NotificationRow notification={notification} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <Link to="/notifications" className="w-full py-2 text-center text-sm font-medium text-brand">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
