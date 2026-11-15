import type { WasteCategoryId } from "@/lib/waste";
import {
  AI_CATEGORY_TO_WASTE_ID,
  AI_IMAGE_QUALITIES,
  AI_SEVERITIES,
  AI_WASTE_CATEGORIES,
  type WasteAnalysis,
} from "../../shared/waste-analysis";

export interface PhotoAnalysisResult {
  analysis: WasteAnalysis;
  categoryId: WasteCategoryId;
  analyzedAt: string;
}

const ANALYSIS_TIMEOUT_MS = 45_000;
const FALLBACK_MESSAGE = "AI photo analysis is unavailable right now. You can still choose the category yourself.";

export async function analyzeReportPhoto(imagePath: string): Promise<PhotoAnalysisResult> {
  let response: Response;
  try {
    response = await fetch("/api/report-photo-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePath }),
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    });
  } catch {
    throw new Error("We could not reach the photo analysis service. Check your connection and try again.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readErrorMessage(payload) ?? FALLBACK_MESSAGE);
  if (!isAnalysisPayload(payload)) throw new Error(FALLBACK_MESSAGE);

  return {
    analysis: payload.analysis,
    categoryId: AI_CATEGORY_TO_WASTE_ID[payload.analysis.primary_category],
    analyzedAt: payload.analyzedAt,
  };
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return null;
  return typeof payload.message === "string" ? payload.message : null;
}

function isAnalysisPayload(payload: unknown): payload is { analysis: WasteAnalysis; analyzedAt: string } {
  if (typeof payload !== "object" || payload === null) return false;
  if (!("analysis" in payload) || !("analyzedAt" in payload) || typeof payload.analyzedAt !== "string") return false;
  const analysis = payload.analysis;
  if (typeof analysis !== "object" || analysis === null) return false;
  return (
    "is_waste" in analysis &&
    typeof analysis.is_waste === "boolean" &&
    "primary_category" in analysis &&
    (AI_WASTE_CATEGORIES as readonly unknown[]).includes(analysis.primary_category) &&
    "image_quality" in analysis &&
    (AI_IMAGE_QUALITIES as readonly unknown[]).includes(analysis.image_quality) &&
    "severity" in analysis &&
    (AI_SEVERITIES as readonly unknown[]).includes(analysis.severity) &&
    "confidence" in analysis &&
    typeof analysis.confidence === "number" &&
    "detected_items" in analysis &&
    Array.isArray(analysis.detected_items) &&
    "environmental_risks" in analysis &&
    Array.isArray(analysis.environmental_risks) &&
    "description" in analysis &&
    typeof analysis.description === "string" &&
    "disposal_recommendation" in analysis &&
    typeof analysis.disposal_recommendation === "string" &&
    "requires_special_handling" in analysis &&
    typeof analysis.requires_special_handling === "boolean"
  );
}
