import { z } from "zod";

export const MunicipalityDatasetItemSchema = z.object({
  ward_number: z.number().int().min(1).max(200),
  councillor_name: z.string().nullable(),
  office_address: z.string().nullable(),
  pin_code: z.string().regex(/^\d{6}$/).nullable().or(z.literal(null)),
  contact_number: z.string().nullable().optional(),
  source_image: z.string(),
  confidence: z.number().min(0).max(1),
  verification_status: z.enum(["pending", "needs_review", "approved", "rejected", "imported"]),
  warnings: z.array(z.string()),
});

export type MunicipalityDatasetItem = z.infer<typeof MunicipalityDatasetItemSchema>;

export const MunicipalityDatasetSchema = z.object({
  metadata: z.object({
    state: z.string(),
    district: z.string(),
    municipality: z.string(),
    municipality_type: z.string(),
    source_images_count: z.number().int().positive(),
    wards_covered: z.string(),
    total_records: z.number().int().positive().optional(),
  }),
  records: z.array(MunicipalityDatasetItemSchema),
});

export type MunicipalityDataset = z.infer<typeof MunicipalityDatasetSchema>;

export interface DatasetValidationReport {
  isValid: boolean;
  totalRecords: number;
  expectedRange: { start: number; end: number };
  missingWardNumbers: number[];
  duplicateWardNumbers: number[];
  flaggedWardsReview: number[];
  automaticallyVerifiedCount: number;
  errors: string[];
}

export function validateMunicipalityDataset(raw: unknown): DatasetValidationReport {
  const errors: string[] = [];

  const parsed = MunicipalityDatasetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      isValid: false,
      totalRecords: 0,
      expectedRange: { start: 16, end: 144 },
      missingWardNumbers: [],
      duplicateWardNumbers: [],
      flaggedWardsReview: [],
      automaticallyVerifiedCount: 0,
      errors: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  const { records } = parsed.data;
  const wardNumbers = records.map((r) => r.ward_number);
  const wardSet = new Set<number>();
  const duplicates: number[] = [];

  for (const num of wardNumbers) {
    if (wardSet.has(num)) {
      duplicates.push(num);
    }
    wardSet.add(num);
  }

  // Check range 16 through 144
  const missing: number[] = [];
  for (let w = 16; w <= 144; w++) {
    if (!wardSet.has(w)) {
      missing.push(w);
    }
  }

  // Mandatory flagged wards that MUST be flagged as needs_review
  const mandatoryFlaggedWards = [47, 116, 117, 118, 132, 135, 136];
  const missingFlags: number[] = [];

  for (const ward of mandatoryFlaggedWards) {
    const item = records.find((r) => r.ward_number === ward);
    if (!item) {
      missingFlags.push(ward);
      errors.push(`Mandatory flagged ward ${ward} not found in dataset.`);
    } else if (item.verification_status !== "needs_review") {
      missingFlags.push(ward);
      errors.push(`Ward ${ward} must have verification_status="needs_review", but was "${item.verification_status}".`);
    } else if (item.warnings.length === 0) {
      errors.push(`Ward ${ward} is flagged for review but has empty warnings list.`);
    }
  }

  // Ensure NEVER automatically marked as verified/approved
  let automaticallyVerifiedCount = 0;
  for (const item of records) {
    if (item.verification_status === "approved" || item.verification_status === "imported") {
      automaticallyVerifiedCount++;
      errors.push(`Ward ${item.ward_number} was automatically marked as "${item.verification_status}", violating zero-auto-verify rule.`);
    }
  }

  if (duplicates.length > 0) {
    errors.push(`Found duplicate ward numbers: ${duplicates.join(", ")}`);
  }
  if (missing.length > 0) {
    errors.push(`Missing ward numbers in 16–144 range: ${missing.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    totalRecords: records.length,
    expectedRange: { start: 16, end: 144 },
    missingWardNumbers: missing,
    duplicateWardNumbers: duplicates,
    flaggedWardsReview: mandatoryFlaggedWards,
    automaticallyVerifiedCount,
    errors,
  };
}
