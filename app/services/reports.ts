import { DEMO_REPORTS, DEMO_STATS } from "@/lib/mock-data";
import type { ReportLocation, Severity, WasteCategoryId, WasteQuantity, WasteReport } from "@/lib/waste";

import { demoLatency } from "./demo";

export interface NewReportInput {
  category: WasteCategoryId;
  aiConfidence: number;
  severity: Severity;
  detectedItems: string[];
  description: string;
  quantity: WasteQuantity;
  durationLabel: string;
  blockingTraffic: boolean;
  sensitiveLocations: string[];
  location: ReportLocation;
}

// TODO: Connect Supabase — replace demo data with a Next.js API route reading the reports table.
export async function listReports(): Promise<WasteReport[]> {
  await demoLatency();
  return DEMO_REPORTS;
}

export async function getReport(reportNumber: string): Promise<WasteReport | undefined> {
  await demoLatency();
  return DEMO_REPORTS.find((report) => report.reportNumber === reportNumber);
}

export async function listResolvedReports(): Promise<WasteReport[]> {
  await demoLatency();
  return DEMO_REPORTS.filter((report) => report.status === "resolved");
}

export async function getReportStats() {
  await demoLatency();
  return DEMO_STATS;
}

// TODO: Connect Supabase — persist the report and upload the image to Supabase Storage before returning.
export async function submitReport(input: NewReportInput): Promise<WasteReport> {
  await demoLatency(900);
  return {
    ...DEMO_REPORTS[0],
    category: input.category,
    aiConfidence: input.aiConfidence,
    severity: input.severity,
    detectedItems: input.detectedItems,
    description: input.description,
    quantity: input.quantity,
    blockingTraffic: input.blockingTraffic,
    location: input.location,
  };
}
