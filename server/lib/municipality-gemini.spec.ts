import { beforeEach, describe, expect, it } from "vitest";
import {
  BatchExtractionSchema,
  ExtractedCouncillorSchema,
  extractMunicipalityRecordsFromImage,
  MunicipalityExtractionError,
} from "./municipality-gemini";

describe("Municipality Gemini Vision Service", () => {
  const originalKey = process.env.GEMINI_API_KEY; // guard:allow-env-credential — test fixture.

  beforeEach(() => {
    process.env.GEMINI_API_KEY = originalKey; // guard:allow-env-credential — test fixture.
  });

  it("throws missing_api_key when GEMINI_API_KEY is not defined", async () => {
    delete process.env.GEMINI_API_KEY; // guard:allow-env-credential — test fixture.

    await expect(
      extractMunicipalityRecordsFromImage(Buffer.from("dummy"), "image/png"),
    ).rejects.toThrowError(MunicipalityExtractionError);

    try {
      await extractMunicipalityRecordsFromImage(Buffer.from("dummy"), "image/png");
    } catch (err) {
      expect(err).toBeInstanceOf(MunicipalityExtractionError);
      expect((err as MunicipalityExtractionError).code).toBe("missing_api_key");
    }
  });

  it("throws invalid_image when empty image buffer is supplied", async () => {
    process.env.GEMINI_API_KEY = "dummy-key"; // guard:allow-env-credential — test fixture.

    await expect(
      extractMunicipalityRecordsFromImage(Buffer.alloc(0), "image/png"),
    ).rejects.toThrowError(MunicipalityExtractionError);
  });

  it("validates Bengali and English councillor names and does not invent missing fields", () => {
    const sampleRecord = {
      state: "West Bengal",
      district: "Kolkata",
      municipality: "Kolkata Municipal Corporation",
      municipality_type: "Municipal Corporation",
      ward_number: 16,
      councillor_name: "SWAPAN KUMAR DAS",
      councillor_name_bengali: "স্বপন কুমার দাস",
      designation: "Councillor",
      contact_number: null, // missing field preserved as null, not invented
      alternate_contact_number: null,
      email: null,
      office_address: "12, Karbala Tank Lane, Kolkata",
      pin_code: "700006",
      original_text: "16 | SWAPAN KUMAR DAS | 12, Karbala Tank Lane",
      confidence: 0.98,
      warnings: [],
    };

    const parsed = ExtractedCouncillorSchema.parse(sampleRecord);
    expect(parsed.ward_number).toBe(16);
    expect(parsed.councillor_name).toBe("SWAPAN KUMAR DAS");
    expect(parsed.councillor_name_bengali).toBe("স্বপন কুমার দাস");
    expect(parsed.contact_number).toBeNull();
    expect(parsed.pin_code).toBe("700006");
  });

  it("handles batch schema validation", () => {
    const batch = {
      records: [
        {
          state: "West Bengal",
          district: "Kolkata",
          municipality: "Kolkata Municipal Corporation",
          municipality_type: "Municipal Corporation",
          ward_number: 47,
          councillor_name: null, // Vacant ward
          councillor_name_bengali: null,
          designation: "Councillor",
          contact_number: null,
          alternate_contact_number: null,
          email: null,
          office_address: null,
          pin_code: null,
          original_text: "47 | - | -",
          confidence: 0.5,
          warnings: ["Empty/vacant councillor record (-) in source table"],
        },
      ],
    };

    const parsed = BatchExtractionSchema.parse(batch);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].ward_number).toBe(47);
    expect(parsed.records[0].councillor_name).toBeNull();
    expect(parsed.records[0].warnings).toContain("Empty/vacant councillor record (-) in source table");
  });
});
