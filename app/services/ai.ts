import { DEMO_AI_REVIEW_ITEMS } from "@/lib/mock-data";

import { demoLatency } from "./demo";

// TODO: Connect Supabase — load low-confidence classifications that need human review.
export async function listReviewItems() {
  await demoLatency();
  return DEMO_AI_REVIEW_ITEMS;
}
