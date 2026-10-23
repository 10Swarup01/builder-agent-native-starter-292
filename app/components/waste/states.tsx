import { IconAlertTriangle, IconInbox, IconRefresh, IconWifiOff, type Icon } from "@tabler/icons-react";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AsyncContentProps {
  loading: boolean;
  error?: Error;
  onRetry: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}

export function AsyncContent({ loading, error, onRetry, skeleton, children }: AsyncContentProps) {
  if (loading) return <>{skeleton ?? <LoadingState />}</>;
  if (error) return <ErrorState onRetry={onRetry} />;
  return <>{children}</>;
}

export function LoadingState({ variant = "cards" }: { variant?: "cards" | "stats" | "detail" }) {
  if (variant === "stats") {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]" aria-busy="true" aria-label="Loading">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-72 rounded-2xl" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: IconComponent = IconInbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-brand">
        <IconComponent size={28} aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <IconAlertTriangle size={32} className="text-danger" aria-hidden="true" />
      <p className="font-medium text-foreground">Something went wrong. Please try again.</p>
      <Button variant="outline" onClick={onRetry} className="min-h-11">
        <IconRefresh size={16} aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm font-medium text-foreground">
      <IconWifiOff size={16} className="text-warning" aria-hidden="true" />
      You&apos;re currently offline. Please check your internet connection.
    </div>
  );
}
