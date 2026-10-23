import { HeaderActionsProvider } from "@agent-native/toolkit/app-shell";
import { useLocation } from "react-router";

import { OfflineBanner } from "@/components/waste/states";

import { MobileBottomNav } from "./MobileBottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface LayoutProps {
  children: React.ReactNode;
}

const FULL_SCREEN_PREFIXES = ["/admin", "/login", "/signup"];

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const fullScreen = FULL_SCREEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (fullScreen) {
    return <HeaderActionsProvider>{children}</HeaderActionsProvider>;
  }

  return (
    <HeaderActionsProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <OfflineBanner />
          <Topbar />
          <main id="main-content" className="agent-native-app-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-28 lg:pb-12">
            <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </HeaderActionsProvider>
  );
}
