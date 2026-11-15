import { IconAlertTriangle, IconRefresh, IconSparkles } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Severity, WasteCategoryId } from "@/lib/waste";
import { AI_CATEGORY_TO_WASTE_ID, type WasteAnalysis } from "../../../shared/waste-analysis";

import { CategoryBadge, SeverityBadge } from "./badges";

export type PhotoAnalysisState = "idle" | "analyzing" | "done" | "error";

interface PhotoAnalysisPanelProps {
  state: PhotoAnalysisState;
  analysis: WasteAnalysis | null;
  error: string | null;
  onRetry: () => void;
}

export function PhotoAnalysisPanel({ state, analysis, error, onRetry }: PhotoAnalysisPanelProps) {
  if (state === "idle") return null;

  return (
    <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-sm" aria-busy={state === "analyzing"}>
      <div className="flex items-center gap-2">
        <IconSparkles size={18} className="text-brand" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">AI identification</h3>
      </div>

      {state === "analyzing" ? (
        <div className="space-y-3">
          <p role="status" className="text-sm text-muted-foreground">
            Analyzing your photo...
          </p>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {state === "error" ? (
        <div className="space-y-3">
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning/15 px-4 py-3 text-sm text-foreground">
            <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            {error}
          </p>
          <Button variant="outline" className="min-h-11" onClick={onRetry}>
            <IconRefresh size={18} aria-hidden="true" />
            Retry AI analysis
          </Button>
        </div>
      ) : null}

      {state === "done" && analysis ? <AnalysisResult analysis={analysis} /> : null}
    </Card>
  );
}

function AnalysisResult({ analysis }: { analysis: WasteAnalysis }) {
  const categoryId: WasteCategoryId = AI_CATEGORY_TO_WASTE_ID[analysis.primary_category];
  const severity = analysis.severity.toLowerCase() as Severity;
  const warnings = [
    !analysis.is_waste ? "The AI did not see clear waste in this photo. Check the category before you continue." : null,
    analysis.is_waste && analysis.image_quality !== "clear"
      ? "The photo is unclear, so this result may be less reliable. Check the category before you continue."
      : null,
    analysis.requires_special_handling
      ? "The AI flagged this material for special handling. Keep clear of it and let the authority assess it."
      : null,
  ].filter((message): message is string => message !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={categoryId} />
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          Confidence {analysis.confidence}%
        </span>
        <SeverityBadge severity={severity} />
      </div>

      {warnings.map((message) => (
        <p key={message} role="note" className="flex items-start gap-2 rounded-xl bg-warning/15 px-4 py-3 text-sm text-foreground">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          {message}
        </p>
      ))}

      <p className="text-sm text-foreground">{analysis.description}</p>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">Detected items</h4>
          {analysis.detected_items.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-foreground">
              {analysis.detected_items.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific items listed.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">Environmental risks</h4>
          {analysis.environmental_risks.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-foreground">
              {analysis.environmental_risks.map((risk, index) => (
                <li key={`${index}-${risk}`}>{risk}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None identified.</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        <h4 className="text-xs font-medium text-muted-foreground">Suggested disposal</h4>
        <p className="text-foreground">{analysis.disposal_recommendation}</p>
      </div>

      {analysis.additional_notes ? <p className="text-sm text-muted-foreground">{analysis.additional_notes}</p> : null}
    </div>
  );
}
