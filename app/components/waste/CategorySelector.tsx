import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { WASTE_CATEGORIES, type WasteCategoryId } from "@/lib/waste";

interface CategorySelectorProps {
  value: WasteCategoryId | null;
  onChange: (category: WasteCategoryId) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div role="radiogroup" aria-label="Waste category" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {WASTE_CATEGORIES.map((category) => {
        const selected = category.id === value;
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              "relative flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-brand bg-accent text-accent-foreground shadow-sm" : "border-border bg-card text-foreground hover:border-brand/40 hover:bg-muted/50",
            )}
          >
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", selected ? "bg-brand text-brand-foreground" : "bg-muted text-brand")}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="leading-tight">{category.label}</span>
            {selected ? <IconCheck size={16} className="absolute right-3 top-3 text-brand" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
