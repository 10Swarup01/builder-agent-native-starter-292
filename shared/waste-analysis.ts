import type { WasteCategoryId } from "../app/lib/waste";

export const AI_WASTE_CATEGORIES = [
  "Plastic Waste",
  "Household Waste",
  "Medical Waste",
  "Chemical Waste",
  "Liquid Waste",
  "Electronic Waste",
  "Glass Waste",
  "Metal Waste",
  "Organic/Biodegradable Waste",
  "Mixed Waste",
  "Other/Unknown",
] as const;

export type AiWasteCategory = (typeof AI_WASTE_CATEGORIES)[number];

export const AI_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export type AiSeverity = (typeof AI_SEVERITIES)[number];

export const AI_IMAGE_QUALITIES = ["clear", "unclear", "insufficient"] as const;

export type AiImageQuality = (typeof AI_IMAGE_QUALITIES)[number];

export interface WasteAnalysis {
  is_waste: boolean;
  image_quality: AiImageQuality;
  primary_category: AiWasteCategory;
  detected_items: string[];
  confidence: number;
  severity: AiSeverity;
  description: string;
  environmental_risks: string[];
  disposal_recommendation: string;
  requires_special_handling: boolean;
  additional_notes: string | null;
}

export const AI_CATEGORY_TO_WASTE_ID: Record<AiWasteCategory, WasteCategoryId> = {
  "Plastic Waste": "plastic",
  "Household Waste": "household",
  "Medical Waste": "medical",
  "Chemical Waste": "chemical",
  "Liquid Waste": "liquid",
  "Electronic Waste": "ewaste",
  "Glass Waste": "glass",
  "Metal Waste": "metal",
  "Organic/Biodegradable Waste": "organic",
  "Mixed Waste": "mixed",
  "Other/Unknown": "mixed",
};
