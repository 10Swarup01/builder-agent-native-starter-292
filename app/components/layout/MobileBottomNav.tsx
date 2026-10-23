import { IconCamera } from "@tabler/icons-react";
import { NavLink } from "react-router";

import { cn } from "@/lib/utils";

import { MOBILE_NAV, type NavItem } from "./nav";

export function MobileBottomNav() {
  const [home, problems, map, profile] = MOBILE_NAV;
  const left = [home, problems];
  const right = [map, profile];

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "text-brand" : "text-muted-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={22} aria-hidden="true" className={cn(isActive && "fill-brand/10")} />
          {item.label}
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {left.map(renderItem)}
        <div className="flex justify-center">
          <NavLink
            to="/report"
            aria-label="Report garbage"
            className="-mt-7 flex size-16 flex-col items-center justify-center gap-0.5 rounded-full bg-brand text-[10px] font-semibold text-brand-foreground shadow-lg ring-4 ring-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconCamera size={24} aria-hidden="true" />
            <span aria-hidden="true">Report</span>
          </NavLink>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
