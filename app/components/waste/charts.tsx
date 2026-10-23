import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import type { ChartDatum } from "@/services/analytics";

export function ChartCard({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`flex flex-col gap-4 rounded-2xl border-border/70 p-5 shadow-sm ${className ?? ""}`}>
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function RingGauge({ percent, label }: { percent: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 128 128" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${percent}%`}>
        <circle cx="64" cy="64" r={radius} fill="none" strokeWidth="12" className="stroke-muted" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-brand transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div>
        <p className="text-3xl font-semibold text-foreground">{percent}%</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function BarList({ data, suffix = "", barClassName = "bg-chart-1" }: { data: ChartDatum[]; suffix?: string; barClassName?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">{item.label}</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {item.value.toLocaleString("en-IN")}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ data, suffix = "", barClassName = "bg-chart-1" }: { data: ChartDatum[]; suffix?: string; barClassName?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="flex h-56 items-end gap-3" role="list" aria-label="Column chart">
      {data.map((item) => (
        <div key={item.label} role="listitem" className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {item.value}
            {suffix}
          </span>
          <div className={`w-full max-w-12 rounded-t-lg ${barClassName}`} style={{ height: `${(item.value / max) * 85}%` }} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ data, suffix = "" }: { data: ChartDatum[]; suffix?: string }) {
  const width = 320;
  const height = 160;
  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((item, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
    const y = height - 20 - ((item.value - min) / range) * (height - 40);
    return { x, y, label: item.label, value: item.value };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible" role="img" aria-label={`Trend: ${data.map((item) => `${item.label} ${item.value}${suffix}`).join(", ")}`}>
        <polyline points={polyline} fill="none" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="stroke-chart-1" />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="4" className="fill-card stroke-chart-1" strokeWidth="2.5" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
