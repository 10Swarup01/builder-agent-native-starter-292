import { IconArrowLeft, IconLogout, IconShieldCheck } from "@tabler/icons-react";
import { NavLink, useNavigate } from "react-router";

import { cn } from "@/lib/utils";
import { signOutOfApp, type CurrentUser } from "@/services/auth";

import { BrandMark } from "./Sidebar";
import { ADMIN_NAV } from "./nav";

export function AdminLayout({ children, adminUser }: { children: React.ReactNode; adminUser?: CurrentUser }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutOfApp();
    navigate("/login?mode=admin");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-muted/40 text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="space-y-3 px-5 pb-4 pt-6">
          <BrandMark />
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">WasteWise AI — Administration</p>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon size={20} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 space-y-1">
          <NavLink to="/" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand hover:bg-muted">
            <IconArrowLeft size={18} aria-hidden="true" />
            Back to app
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <IconLogout size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground lg:hidden">WasteWise AI — Administration</p>
            <div className="hidden lg:flex lg:items-center lg:gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <IconShieldCheck size={16} className="text-emerald-500" />
                {adminUser?.email || adminUser?.name || "Administrator"}
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Verified Admin
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Sign out
              </button>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <IconLogout size={16} aria-hidden="true" />
                Sign out
              </button>
              <NavLink to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand">
                <IconArrowLeft size={16} aria-hidden="true" />
                App
              </NavLink>
            </div>
          </div>
          <nav aria-label="Admin sections" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium",
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main id="admin-main" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
