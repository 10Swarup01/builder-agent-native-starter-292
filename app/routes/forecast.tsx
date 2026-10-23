import { IconMapPin, IconRobot, IconSparkles } from "@tabler/icons-react";

import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { Card } from "@/components/ui/card";
import { useServiceData } from "@/hooks/use-service-data";
import { formatCount } from "@/lib/format";
import { getCategory } from "@/lib/waste";
import { getForecast } from "@/services/forecast";

export function meta() {
  return [{ title: "AI Forecast · WasteWise AI" }];
}

export default function ForecastRoute() {
  const forecast = useServiceData(getForecast);

  return (
    <div className="space-y-6">
      <PageHeader title="AI Waste Forecast" description="Estimated waste volumes for the next day, to plan collection capacity." icon={IconRobot} demo />

      <AsyncContent loading={forecast.loading} error={forecast.error} onRetry={forecast.retry} skeleton={<LoadingState variant="stats" />}>
        {forecast.data ? (
          <>
            <section aria-labelledby="prediction-heading" className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="prediction-heading" className="text-lg font-semibold text-foreground">
                  Predicted Waste — Tomorrow
                </h2>
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">Demo Prediction</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {forecast.data.tomorrowKg.map((item) => {
                  const category = getCategory(item.category);
                  const Icon = category.icon;
                  return (
                    <Card key={item.category} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 shadow-sm lg:p-5">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-brand">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <p className="text-sm text-muted-foreground">{category.shortLabel}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCount(item.kg)} <span className="text-base font-medium text-muted-foreground">kg</span>
                      </p>
                    </Card>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="areas-heading" className="space-y-3">
                <h2 id="areas-heading" className="text-lg font-semibold text-foreground">
                  High-Waste Areas
                </h2>
                <Card className="divide-y divide-border rounded-2xl border-border/70 shadow-sm">
                  {forecast.data.highWasteAreas.map((area) => (
                    <div key={area} className="flex items-center gap-3 p-4">
                      <IconMapPin size={18} className="text-danger" aria-hidden="true" />
                      <span className="font-medium text-foreground">{area}</span>
                      <span className="ml-auto text-xs text-muted-foreground">Demo</span>
                    </div>
                  ))}
                </Card>
              </section>

              <section aria-labelledby="recommendation-heading" className="space-y-3">
                <h2 id="recommendation-heading" className="text-lg font-semibold text-foreground">
                  AI Recommendation
                </h2>
                <Card className="flex gap-4 rounded-2xl border-brand/20 bg-accent/50 p-5 shadow-sm">
                  <IconSparkles size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                  <blockquote className="text-base leading-relaxed text-foreground">“{forecast.data.recommendation}”</blockquote>
                </Card>
              </section>
            </div>
          </>
        ) : null}
      </AsyncContent>
    </div>
  );
}
