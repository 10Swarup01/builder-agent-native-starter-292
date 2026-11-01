import { IconCheck, IconSparkles } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WasteAnalysis } from "@/lib/waste";

import { CategoryBadge, SeverityBadge } from "./badges";

export function AIAnalyzingCard() {
  return (
    <Card className="animate-fade-up space-y-4 rounded-2xl border-border/70 p-5 shadow-sm lg:p-6">
      <div className="flex items-center gap-2 text-brand">
        <IconSparkles size={22} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">AI Analyzing Waste...</h2>
      </div>
      <p className="text-sm text-muted-foreground">AI is analyzing the image and identifying the type of waste.</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="AI analysis in progress" aria-valuetext="Analyzing">
        <div className="h-full w-1/3 animate-indeterminate rounded-full bg-brand" />
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>Checking material and surface type</li>
        <li>Estimating severity and quantity</li>
      </ul>
    </Card>
  );
}

interface AIResultCardProps {
  analysis: WasteAnalysis;
  onConfirm: () => void;
  onChangeCategory: () => void;
}

export function AIResultCard({ analysis, onConfirm, onChangeCategory }: AIResultCardProps) {
  return (
    <Card className="animate-fade-up space-y-5 rounded-2xl border-border/70 p-5 shadow-sm lg:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <IconSparkles size={20} className="text-brand" aria-hidden="true" />
        AI Waste Detection
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge category={analysis.category} className="text-sm" />
        <span className="text-sm font-semibold text-foreground">{analysis.confidence}% Confidence</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-brand" style={{ width: `${analysis.confidence}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Severity:</span>
        <SeverityBadge severity={analysis.severity} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Detected items</h3>
        <ul className="flex flex-wrap gap-2">
          {analysis.detectedItems.map((item) => (
            <li key={item} className="rounded-lg bg-muted px-2.5 py-1 text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" className="min-h-12" onClick={onConfirm}>
          <IconCheck size={18} aria-hidden="true" />
          Confirm Classification
        </Button>
        <Button size="lg" variant="outline" className="min-h-12" onClick={onChangeCategory}>
          Change Category
        </Button>
      </div>
    </Card>
  );
}
