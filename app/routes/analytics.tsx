import { IconChartBar } from "@tabler/icons-react";

import { AnalyticsView } from "@/components/waste/AnalyticsView";
import { PageHeader } from "@/components/waste/PageHeader";

export function meta() {
  return [{ title: "Analytics · WasteWise AI" }];
}

export default function AnalyticsRoute() {
  return (
    <div>
      <PageHeader title="Waste Management Analytics" description="Volumes, resolution speed and hotspots across all wards." icon={IconChartBar} demo />
      <AnalyticsView />
    </div>
  );
}
