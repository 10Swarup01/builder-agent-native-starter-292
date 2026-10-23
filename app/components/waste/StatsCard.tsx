import type { Icon } from "@tabler/icons-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  icon: Icon;
  hint?: string;
  tone?: "brand" | "warning" | "danger" | "success" | "info";
}

const TONE_CLASS: Record<NonNullable<StatsCardProps["tone"]>, string> = {
  brand: "bg-accent text-brand",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export function StatsCard({ label, value, icon: IconComponent, hint, tone = "brand" }: StatsCardProps) {
  return (
    <Card className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 shadow-sm transition duration-200 hover:shadow-md lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", TONE_CLASS[tone])}>
          <IconComponent size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
