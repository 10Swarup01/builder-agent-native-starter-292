import { cn } from "@/lib/utils";
import { getCategory, type WasteCategoryId } from "@/lib/waste";

interface WastePhotoProps {
  category: WasteCategoryId;
  src?: string;
  alt: string;
  tone?: "waste" | "clean";
  className?: string;
}

export function WastePhoto({ category, src, alt, tone = "waste", className }: WastePhotoProps) {
  if (src) {
    return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
  }
  const meta = getCategory(category);
  const Icon = meta.icon;
  const isClean = tone === "clean";
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        isClean ? "bg-linear-to-br from-brand-fresh/25 via-brand/10 to-background" : "bg-linear-to-br from-muted via-background to-chart-3/15",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <Icon size={28} aria-hidden="true" className={isClean ? "text-brand" : "text-muted-foreground"} />
        </span>
        <span className="text-xs font-medium">{isClean ? "Cleaned area" : `${meta.shortLabel} photo`}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-70">Demo image</span>
      </div>
    </div>
  );
}
