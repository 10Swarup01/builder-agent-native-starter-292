import { IconAlertOctagon, IconAlertTriangle, IconCircleCheck, IconCircleDot, IconInfoCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  getCategory,
  SEVERITY_META,
  STATUS_META,
  type ReportStatus,
  type Severity,
  type WasteCategoryId,
} from "@/lib/waste";

const pillClass = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap";

export function CategoryBadge({ category, className }: { category: WasteCategoryId; className?: string }) {
  const meta = getCategory(category);
  const Icon = meta.icon;
  return (
    <span className={cn(pillClass, "border-border bg-secondary text-secondary-foreground", className)}>
      <Icon size={14} aria-hidden="true" className="text-brand" />
      {meta.label}
    </span>
  );
}

const SEVERITY_ICON: Record<Severity, typeof IconInfoCircle> = {
  low: IconInfoCircle,
  medium: IconCircleDot,
  high: IconAlertTriangle,
  critical: IconAlertOctagon,
};

export function SeverityBadge({ severity, className }: { severity: Severity | null; className?: string }) {
  if (!severity) {
    return <span className={cn(pillClass, "bg-muted text-muted-foreground border-border", className)}>Not assessed</span>;
  }
  const meta = SEVERITY_META[severity];
  const Icon = SEVERITY_ICON[severity];
  return (
    <span className={cn(pillClass, meta.className, className)}>
      <Icon size={14} aria-hidden="true" />
      <span>{meta.label} priority</span>
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = status === "resolved" ? IconCircleCheck : IconCircleDot;
  return (
    <span className={cn(pillClass, meta.className, className)}>
      <Icon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
