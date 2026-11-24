import { ApiError, FinishReason, type GoogleGenAI } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WASTE_CATEGORIES } from "../../app/lib/waste";
import { AI_CATEGORY_TO_WASTE_ID, AI_WASTE_CATEGORIES } from "../../shared/waste-analysis";
import {
  analyzeWastePhoto,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  detectReportImageType,
  parseStoredWasteAnalysis,
  parseWasteAnalysis,
  readAiConfig,
  readGeminiConfig,
  WastePhotoError,
  type WastePhotoErrorCode,
} from "./waste-photo-analysis";

const validOutput = {
  is_waste: true,
  image_quality: "clear",
  primary_category: "Plastic Waste",
  detected_items: ["Plastic bottles", "Plastic wrappers"],
  confidence: 94,
  severity: "Medium",
  description: "Plastic waste dumped beside a roadside.",
  environmental_risks: ["Drain blockage", "Soil pollution"],
  disposal_recommendation: "Collect and send recyclable plastics to an authorized recycling facility.",
  requires_special_handling: false,
  additional_notes: "",
};

const config = { apiKey: "test-secret-key", model: "gemini-test-model" };
const photo = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg" as const };

function codeOf(fn: () => unknown): WastePhotoErrorCode | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof WastePhotoError ? error.code : undefined;
  }
  return undefined;
}

async function codeOfAsync(promise: Promise<unknown>): Promise<WastePhotoErrorCode | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof WastePhotoError ? error.code : undefined;
  }
  return undefined;
}

function clientReturning(generateContent: ReturnType<typeof vi.fn>): Pick<GoogleGenAI, "models"> {
  return { models: { generateContent } } as unknown as Pick<GoogleGenAI, "models">;
}

const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readGeminiConfig", () => {
  it("fails with a configuration error when the key is missing", () => {
    expect(codeOf(() => readGeminiConfig({}))).toBe("not_configured");
    expect(codeOf(() => readGeminiConfig({ GEMINI_API_KEY: "   " }))).toBe("not_configured");
  });

  it("uses the default model when GEMINI_MODEL is empty and trims the key", () => {
    expect(readGeminiConfig({ GEMINI_API_KEY: " key-value ", GEMINI_MODEL: "" })).toEqual({
      apiKey: "key-value",
      model: DEFAULT_GEMINI_MODEL,
    });
  });

  it("accepts a configured model id", () => {
    expect(readGeminiConfig({ GEMINI_API_KEY: "key", GEMINI_MODEL: "gemini-3.6-flash" }).model).toBe("gemini-3.6-flash");
  });

  it("rejects a malformed model id without echoing the key", () => {
    let thrown: unknown;
    try {
      readGeminiConfig({ GEMINI_API_KEY: "test-secret-key", GEMINI_MODEL: "not a model!" });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WastePhotoError);
    expect((thrown as Error).message).not.toContain("test-secret-key");
  });
});

describe("readAiConfig", () => {
  it("prefers Groq when GROQ_API_KEY is present", () => {
    expect(readAiConfig({ GROQ_API_KEY: "groq-key" })).toEqual({
      provider: "groq",
      apiKey: "groq-key",
      model: DEFAULT_GROQ_MODEL,
    });
  });

  it("accepts a custom Groq model with slashes", () => {
    expect(readAiConfig({ GROQ_API_KEY: "groq-key", GROQ_MODEL: "qwen/qwen3.8-27b" })).toEqual({
      provider: "groq",
      apiKey: "groq-key",
      model: "qwen/qwen3.8-27b",
    });
  });

  it("falls back to Gemini when GROQ_API_KEY is missing", () => {
    expect(readAiConfig({ GEMINI_API_KEY: "gemini-key" })).toEqual({
      provider: "gemini",
      apiKey: "gemini-key",
      model: DEFAULT_GEMINI_MODEL,
    });
  });

  it("throws not_configured when neither key is provided", () => {
    expect(codeOf(() => readAiConfig({}))).toBe("not_configured");
  });
});

describe("detectReportImageType", () => {
  it("identifies JPEG, PNG and WEBP by file signature", () => {
    expect(detectReportImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectReportImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectReportImageType(new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]))).toBe("image/webp");
  });

  it("rejects other formats, text, and empty input", () => {
    expect(detectReportImageType(new Uint8Array(ascii("GIF89a")))).toBeNull();
    expect(detectReportImageType(new Uint8Array(ascii("<html>not an image</html>")))).toBeNull();
    expect(detectReportImageType(new Uint8Array())).toBeNull();
  });
});

describe("parseWasteAnalysis", () => {
  it("accepts a valid response and normalizes empty notes to null", () => {
    const result = parseWasteAnalysis(JSON.stringify(validOutput));
    expect(result.primary_category).toBe("Plastic Waste");
    expect(result.additional_notes).toBeNull();
  });

  it("drops fields outside the schema", () => {
    const result = parseWasteAnalysis(JSON.stringify({ ...validOutput, is_toxic: true }));
    expect(result).not.toHaveProperty("is_toxic");
  });

  it("rejects text that is not JSON", () => {
    expect(codeOf(() => parseWasteAnalysis("Sure! It looks like plastic."))).toBe("invalid_response");
  });

  it("rejects categories outside the allowed list", () => {
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, primary_category: "Hazardous" })))).toBe("invalid_response");
  });

  it("rejects confidence outside 0 to 100 or not an integer", () => {
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, confidence: 101 })))).toBe("invalid_response");
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, confidence: 90.5 })))).toBe("invalid_response");
  });

  it("rejects a missing required field", () => {
    const { description: _omitted, ...incomplete } = validOutput;
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify(incomplete)))).toBe("invalid_response");
  });

  it("rejects a blank description", () => {
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, description: "   " })))).toBe("invalid_response");
  });

  it("rejects oversized arrays and overlong item names", () => {
    const tooManyItems = Array.from({ length: 21 }, (_, index) => `item ${index}`);
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, detected_items: tooManyItems })))).toBe("invalid_response");
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, detected_items: ["x".repeat(121)] })))).toBe("invalid_response");
  });

  it("rejects a severity outside the allowed list", () => {
    expect(codeOf(() => parseWasteAnalysis(JSON.stringify({ ...validOutput, severity: "Extreme" })))).toBe("invalid_response");
  });
});

describe("parseStoredWasteAnalysis", () => {
  it("accepts a stored analysis whose notes are null", () => {
    const stored = { ...validOutput, additional_notes: null };
    expect(parseStoredWasteAnalysis(stored)?.additional_notes).toBeNull();
  });

  it("returns null for stored data that fails validation", () => {
    expect(parseStoredWasteAnalysis({ ...validOutput, primary_category: "Hazardous" })).toBeNull();
    expect(parseStoredWasteAnalysis(null)).toBeNull();
  });
});

describe("AI category mapping", () => {
  it("maps every AI category to an existing report category", () => {
    const knownIds = WASTE_CATEGORIES.map((category) => category.id);
    for (const label of AI_WASTE_CATEGORIES) {
      expect(knownIds).toContain(AI_CATEGORY_TO_WASTE_ID[label]);
    }
  });
});

describe("analyzeWastePhoto", () => {
  it("sends the image inline with a structured JSON request and returns the validated result", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(validOutput),
      candidates: [{ finishReason: FinishReason.STOP }],
    });

    const result = await analyzeWastePhoto(photo, config, clientReturning(generateContent));

    expect(result.primary_category).toBe("Plastic Waste");
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-test-model");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema.required).toContain("primary_category");
    expect(request.contents[0].parts[0].inlineData).toEqual({
      mimeType: "image/jpeg",
      data: Buffer.from(photo.bytes).toString("base64"),
    });
  });

  it("never places the API key in the request", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(validOutput), candidates: [] });
    await analyzeWastePhoto(photo, config, clientReturning(generateContent));
    expect(JSON.stringify(generateContent.mock.calls[0][0])).not.toContain(config.apiKey);
  });

  it("reports an empty model response as invalid", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: "", candidates: [] });
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("invalid_response");
  });

  it("reports a malformed model response as invalid", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: "{\"primary_category\":", candidates: [] });
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("invalid_response");
  });

  it("reports a prompt blocked by safety as blocked", async () => {
    const generateContent = vi.fn().mockResolvedValue({ promptFeedback: { blockReason: "SAFETY" } });
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("blocked");
  });

  it("reports a response stopped by safety as blocked", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: "", candidates: [{ finishReason: FinishReason.SAFETY }] });
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("blocked");
  });

  it.each([
    [new ApiError({ message: "quota exceeded", status: 429 }), "provider_rate_limited"],
    [new ApiError({ message: "API key not valid. Please pass a valid API key.", status: 400 }), "provider_auth_failed"],
    [new ApiError({ message: "forbidden", status: 403 }), "provider_auth_failed"],
    [new ApiError({ message: "internal", status: 500 }), "provider_unavailable"],
    [new ApiError({ message: "unsupported image", status: 400 }), "provider_rejected"],
  ])("maps Gemini API errors to a safe code (%#)", async (apiError, expected) => {
    const generateContent = vi.fn().mockRejectedValue(apiError);
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe(expected);
  });

  it("maps a timed-out request to timeout", async () => {
    const timeout = Object.assign(new Error("The operation timed out"), { name: "TimeoutError" });
    const generateContent = vi.fn().mockRejectedValue(timeout);
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("timeout");
  });

  it("maps unknown network failures to provider_unavailable", async () => {
    const generateContent = vi.fn().mockRejectedValue(new Error("socket hang up"));
    expect(await codeOfAsync(analyzeWastePhoto(photo, config, clientReturning(generateContent)))).toBe("provider_unavailable");
  });

  it("never exposes provider error text or the API key to the caller", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValue(new ApiError({ message: "bad key test-secret-key", status: 400 }));
    let thrown: unknown;
    try {
      await analyzeWastePhoto(photo, config, clientReturning(generateContent));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WastePhotoError);
    expect((thrown as Error).message).not.toContain("test-secret-key");
  });
});
