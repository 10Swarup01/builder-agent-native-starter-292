import { IconUserCircle } from "@tabler/icons-react";
import { Link } from "react-router";

import { NotificationDropdown } from "@/components/waste/NotificationDropdown";
import { APP_TITLE } from "@/lib/app-config";

import { BrandMark } from "./Sidebar";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6 lg:justify-end lg:px-8">
      <Link to="/" aria-label={`${APP_TITLE} home`} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
        <BrandMark />
      </Link>
      <div className="flex items-center gap-1">
        <NotificationDropdown />
        <Link
          to="/profile"
          aria-label="My profile"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconUserCircle size={28} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
