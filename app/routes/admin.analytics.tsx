import { IconChartBar } from "@tabler/icons-react";

import { AnalyticsView } from "@/components/waste/AnalyticsView";
import { PageHeader } from "@/components/waste/PageHeader";

export function meta() {
  return [{ title: "Analytics · Admin · WasteWise AI" }];
}

export default function AdminAnalyticsRoute() {
  return (
    <div>
      <PageHeader title="Analytics" description="City-wide reporting, resolution speed and hotspots." icon={IconChartBar} demo />
      <AnalyticsView />
    </div>
  );
}
