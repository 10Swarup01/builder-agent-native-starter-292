import {
  DEMO_AREA_COUNTS,
  DEMO_CATEGORY_COUNTS,
  DEMO_MONTHLY_REPORTS,
  DEMO_RESOLUTION_RATE_TREND,
  DEMO_RESOLUTION_TIME_TREND,
  DEMO_STATS,
} from "@/lib/mock-data";
import { getCategory, WASTE_CATEGORIES, type WasteCategoryId } from "@/lib/waste";

import { demoLatency } from "./demo";

export interface ChartDatum {
  label: string;
  value: number;
}

export interface AnalyticsSnapshot {
  stats: typeof DEMO_STATS;
  averageResolutionHours: number;
  mostReportedCategory: string;
  mostProblematicArea: string;
  wasteByCategory: ChartDatum[];
  reportsByArea: ChartDatum[];
  monthlyReports: ChartDatum[];
  resolutionRateTrend: ChartDatum[];
  resolutionTimeTrend: ChartDatum[];
}

// TODO: Connect Supabase — aggregate these values from the reports table.
export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  await demoLatency();
  const wasteByCategory = WASTE_CATEGORIES.map((category) => ({
    label: category.shortLabel,
    value: DEMO_CATEGORY_COUNTS[category.id],
  }));
  const [topCategoryId] = (Object.entries(DEMO_CATEGORY_COUNTS) as [WasteCategoryId, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const topArea = [...DEMO_AREA_COUNTS].sort((a, b) => b.value - a.value)[0];
  return {
    stats: DEMO_STATS,
    averageResolutionHours: 41,
    mostReportedCategory: getCategory(topCategoryId).label,
    mostProblematicArea: topArea.label,
    wasteByCategory,
    reportsByArea: DEMO_AREA_COUNTS,
    monthlyReports: DEMO_MONTHLY_REPORTS,
    resolutionRateTrend: DEMO_RESOLUTION_RATE_TREND,
    resolutionTimeTrend: DEMO_RESOLUTION_TIME_TREND,
  };
}
