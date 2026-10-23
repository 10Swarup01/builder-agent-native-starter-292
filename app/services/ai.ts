import { DEMO_AI_REVIEW_ITEMS, DEMO_ANALYSIS } from "@/lib/mock-data";
import type { WasteAnalysis } from "@/lib/waste";

import { demoLatency } from "./demo";

// TODO: Connect Supabase — load low-confidence classifications that need human review.
export async function listReviewItems() {
  await demoLatency();
  return DEMO_AI_REVIEW_ITEMS;
}

// TODO: Connect Gemini AI — send the image to a server route; the Gemini API key must stay on the server.
export async function analyzeWasteImage(_image: File): Promise<WasteAnalysis> {
  await demoLatency(2200);
  return { ...DEMO_ANALYSIS, detectedItems: [...DEMO_ANALYSIS.detectedItems] };
}
