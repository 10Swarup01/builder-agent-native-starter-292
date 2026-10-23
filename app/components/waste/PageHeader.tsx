import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: Icon;
  actions?: ReactNode;
  demo?: boolean;
}

export function PageHeader({ title, description, icon: IconComponent, actions, demo = false }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            {IconComponent ? <IconComponent size={28} className="text-brand" aria-hidden="true" /> : null}
            {title}
          </h1>
          {demo ? <DemoBadge /> : null}
        </div>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground lg:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
      Demo data
    </span>
  );
}
