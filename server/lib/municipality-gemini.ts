import { ApiError, GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

// Strict Zod Validation Schema
export const ExtractedCouncillorSchema = z.object({
  state: z.string().default("West Bengal"),
  district: z.string().nullable().default("Kolkata"),
  municipality: z.string().nullable().default("Kolkata Municipal Corporation"),
  municipality_type: z.string().nullable().default("Municipal Corporation"),
  ward_number: z.number().int().nullable(),
  councillor_name: z.string().nullable(),
  councillor_name_bengali: z.string().nullable(),
  designation: z.string().default("Councillor"),
  contact_number: z.string().nullable(),
  alternate_contact_number: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal(null)).catch(null),
  office_address: z.string().nullable(),
  pin_code: z.string().regex(/^\d{6}$/).nullable().or(z.literal(null)).catch(null),
  original_text: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
});

export type ExtractedCouncillor = z.infer<typeof ExtractedCouncillorSchema>;

export const BatchExtractionSchema = z.object({
  records: z.array(ExtractedCouncillorSchema),
});

export type BatchExtraction = z.infer<typeof BatchExtractionSchema>;

// Gemini Structured Output Schema
const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    records: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          state: { type: Type.STRING },
          district: { type: Type.STRING, nullable: true },
          municipality: { type: Type.STRING, nullable: true },
          municipality_type: { type: Type.STRING, nullable: true },
          ward_number: { type: Type.INTEGER, nullable: true },
          councillor_name: { type: Type.STRING, nullable: true },
          councillor_name_bengali: { type: Type.STRING, nullable: true },
          designation: { type: Type.STRING },
          contact_number: { type: Type.STRING, nullable: true },
          alternate_contact_number: { type: Type.STRING, nullable: true },
          email: { type: Type.STRING, nullable: true },
          office_address: { type: Type.STRING, nullable: true },
          pin_code: { type: Type.STRING, nullable: true },
          original_text: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["state", "ward_number", "councillor_name", "original_text", "confidence", "warnings"],
      },
    },
  },
  required: ["records"],
};

export class MunicipalityExtractionError extends Error {
  constructor(public code: "missing_api_key" | "rate_limited" | "invalid_image" | "provider_error" | "validation_error", message: string) {
    super(message);
    this.name = "MunicipalityExtractionError";
  }
}

export async function extractMunicipalityRecordsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  metadataContext: Record<string, unknown> = {},
): Promise<BatchExtraction> {
  const apiKey = process.env.GEMINI_API_KEY; // guard:allow-env-credential — server-side Gemini key for municipal OCR.
  if (!apiKey || !apiKey.trim()) {
    throw new MunicipalityExtractionError(
      "missing_api_key",
      "GEMINI_API_KEY is not configured on the server. Please configure it in your environment variables.",
    );
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new MunicipalityExtractionError("invalid_image", "An image buffer is required for extraction.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash"; // guard:allow-env-credential — server-side vision model override.

  const prompt = `
You are an expert OCR and municipal document extraction system for Indian local government records.
Extract EVERY row and councillor record visible in this image.
Context hints (use only if not contradicted by the image): ${JSON.stringify(metadataContext)}

CRITICAL RULES:
1. NEVER invent, guess, or hallucinate missing names, phone numbers, or addresses. If a cell has "-" or is blank, return null.
2. If text is blurry, truncated, or contains HTML/OCR artifacts (e.g. "/td>"), preserve the exact text in "original_text", clean obvious artifacts only if unambiguous, and add a clear warning string to "warnings" while lowering "confidence" below 0.80.
3. Handle both English and Bengali text. If Bengali is present, keep original Bengali in "councillor_name_bengali" and English transliteration in "councillor_name".
4. Extract 6-digit Indian PIN codes into "pin_code".
5. Validate phone numbers: Indian mobile numbers are 10 digits (+91 optional), landline numbers include STD code (e.g., 033-XXXXXXXX). Flag invalid formats in "warnings".
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
        temperature: 0.1,
      },
    });

    if (!response.text) {
      throw new MunicipalityExtractionError("provider_error", "Empty response received from Gemini Vision.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.text);
    } catch {
      throw new MunicipalityExtractionError("validation_error", "Could not parse Gemini Vision response as JSON.");
    }

    const validation = BatchExtractionSchema.safeParse(parsedJson);
    if (!validation.success) {
      console.warn("[municipality-gemini] Schema validation issues:", validation.error.format());
      throw new MunicipalityExtractionError(
        "validation_error",
        `Extraction schema mismatch: ${validation.error.issues.map((e) => e.message).join(", ")}`,
      );
    }

    return validation.data;
  } catch (err: unknown) {
    if (err instanceof MunicipalityExtractionError) throw err;

    if (err instanceof ApiError) {
      if (err.status === 429) {
        throw new MunicipalityExtractionError("rate_limited", "Gemini API rate limit exceeded. Please try again shortly.");
      }
      if (err.status === 401 || err.status === 403) {
        throw new MunicipalityExtractionError("provider_error", "Gemini API key is invalid or unauthorized.");
      }
    }

    const message = err instanceof Error ? err.message : "Unknown error during extraction";
    console.error("[municipality-gemini] Vision extraction failed:", err);
    throw new MunicipalityExtractionError("provider_error", `Municipality extraction failed: ${message}`);
  }
}
