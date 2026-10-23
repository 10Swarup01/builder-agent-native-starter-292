import { IconAlertTriangle, IconCheck, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategorySelector } from "@/components/waste/CategorySelector";
import { CategoryBadge } from "@/components/waste/badges";
import { ConfirmDialog } from "@/components/waste/ConfirmDialog";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { WastePhoto } from "@/components/waste/WastePhoto";
import { useServiceData } from "@/hooks/use-service-data";
import { getCategory, type WasteCategoryId } from "@/lib/waste";
import { listReviewItems } from "@/services/ai";

export function meta() {
  return [{ title: "AI Classification Review · WasteWise AI" }];
}

type ReviewItem = Awaited<ReturnType<typeof listReviewItems>>[number];

export default function AdminAiReviewRoute() {
  const items = useServiceData(listReviewItems);
  const [decisions, setDecisions] = useState<Record<string, WasteCategoryId | "confirmed">>({});
  const [changing, setChanging] = useState<ReviewItem | null>(null);
  const [draftCategory, setDraftCategory] = useState<WasteCategoryId | null>(null);

  const openChange = (item: ReviewItem) => {
    setDraftCategory(item.predictedCategory);
    setChanging(item);
  };

  const saveChange = () => {
    if (!changing || !draftCategory) return;
    setDecisions((current) => ({ ...current, [changing.id]: draftCategory }));
    setChanging(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Classification Review" description="Humans make the final call when the AI is unsure." icon={IconSparkles} demo />

      <AsyncContent loading={items.loading} error={items.error} onRetry={items.retry} skeleton={<LoadingState variant="detail" />}>
        {items.data && items.data.length === 0 ? <EmptyState title="Nothing to review" description="All recent classifications are confident enough." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {(items.data ?? []).map((item) => {
            const decision = decisions[item.id];
            const finalCategory = decision && decision !== "confirmed" ? decision : item.predictedCategory;
            return (
              <Card key={item.id} className="grid gap-5 rounded-2xl border-border/70 p-4 shadow-sm sm:grid-cols-[11rem_1fr] sm:p-5">
                <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border sm:aspect-square">
                  <WastePhoto category={item.predictedCategory} alt={`Photo for ${item.reportNumber}`} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-muted-foreground">{item.reportNumber}</p>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI prediction</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.predictedCategory} />
                      <span className="text-sm font-semibold text-foreground">{item.confidence}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">System recommendation</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                      <IconAlertTriangle size={14} aria-hidden="true" />
                      {item.recommendation}
                    </span>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  {decision ? (
                    <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                      <IconCheck size={16} aria-hidden="true" />
                      Decision saved: {decision === "confirmed" ? "AI result confirmed" : `changed to ${getCategory(finalCategory).label}`}
                    </p>
                  ) : null}
                  <div className="mt-auto grid gap-2 sm:grid-cols-2">
                    <Button className="min-h-11" onClick={() => setDecisions((current) => ({ ...current, [item.id]: "confirmed" }))}>
                      <IconCheck size={16} aria-hidden="true" />
                      Confirm
                    </Button>
                    <Button variant="outline" className="min-h-11" onClick={() => openChange(item)}>
                      Change Category
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </AsyncContent>

      <ConfirmDialog
        open={changing !== null}
        onOpenChange={(open) => {
          if (!open) setChanging(null);
        }}
        title="Change category"
        description={changing ? `Select the correct waste type for ${changing.reportNumber}.` : ""}
        confirmLabel="Save category"
        onConfirm={saveChange}
      >
        <CategorySelector value={draftCategory} onChange={setDraftCategory} />
      </ConfirmDialog>
    </div>
  );
}
