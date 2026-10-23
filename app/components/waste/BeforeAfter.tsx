import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";

import type { WasteCategoryId } from "@/lib/waste";

import { WastePhoto } from "./WastePhoto";

interface BeforeAfterProps {
  category: WasteCategoryId;
  beforeSrc?: string;
  afterSrc?: string;
  reportNumber: string;
}

export function BeforeAfter({ category, beforeSrc, afterSrc, reportNumber }: BeforeAfterProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
      <figure className="relative overflow-hidden rounded-2xl border border-border bg-muted">
        <div className="aspect-[4/3]">
          <WastePhoto category={category} src={beforeSrc} alt={`Before cleanup, report ${reportNumber}`} />
        </div>
        <figcaption className="absolute left-3 top-3 rounded-md bg-danger px-2.5 py-1 text-xs font-bold tracking-wider text-white shadow-sm">
          BEFORE
        </figcaption>
      </figure>
      <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true">
        <IconArrowRight className="hidden md:block" size={24} />
        <IconArrowDown className="md:hidden" size={24} />
      </div>
      <figure className="relative overflow-hidden rounded-2xl border border-border bg-muted">
        <div className="aspect-[4/3]">
          <WastePhoto category={category} src={afterSrc} tone="clean" alt={`After cleanup, report ${reportNumber}`} />
        </div>
        <figcaption className="absolute left-3 top-3 rounded-md bg-success px-2.5 py-1 text-xs font-bold tracking-wider text-white shadow-sm">
          AFTER
        </figcaption>
      </figure>
    </div>
  );
}
