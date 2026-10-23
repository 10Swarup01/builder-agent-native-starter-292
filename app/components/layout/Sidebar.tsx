import { IconRecycle } from "@tabler/icons-react";
import { NavLink } from "react-router";

import { APP_TAGLINE, APP_TITLE } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { useServiceData } from "@/hooks/use-service-data";
import { getCurrentUser } from "@/services/auth";

import { ADMIN_ENTRY_ICON, PUBLIC_NAV } from "./nav";

export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
        <IconRecycle size={20} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight text-foreground">{APP_TITLE}</span>
        <span className="text-[11px] text-muted-foreground">{APP_TAGLINE}</span>
      </span>
    </span>
  );
}

export function Sidebar() {
  const { data: user } = useServiceData(getCurrentUser);
  const canAdmin = user?.role === "admin" || user?.role === "authority";
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background lg:flex">
      <div className="px-5 pb-4 pt-6">
        <NavLink to="/" aria-label={`${APP_TITLE} home`} className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark />
        </NavLink>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3">
        {PUBLIC_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} aria-hidden="true" className={cn(isActive && "text-brand")} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {canAdmin ? (
        <div className="border-t border-sidebar-border p-3">
          <NavLink
            to="/admin"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-brand transition hover:bg-sidebar-accent"
          >
            <ADMIN_ENTRY_ICON size={20} aria-hidden="true" />
            Admin Panel
          </NavLink>
        </div>
      ) : null}
    </aside>
  );
}
