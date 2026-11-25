import { describe, expect, it } from "vitest";
import dataset from "../data/kmc-councillors-129.json";
import { validateMunicipalityDataset } from "./municipality-dataset-validator";

describe("KMC 129-Ward Dataset Validator", () => {
  it("validates that the complete dataset has all 129 records in range 16-144", () => {
    const report = validateMunicipalityDataset(dataset);

    expect(report.isValid).toBe(true);
    expect(report.totalRecords).toBe(129);
    expect(report.missingWardNumbers).toEqual([]);
    expect(report.duplicateWardNumbers).toEqual([]);
    expect(report.errors).toEqual([]);
  });

  it("ensures wards 47, 116, 117, 118, 132, 135 and 136 are flagged for review", () => {
    const report = validateMunicipalityDataset(dataset);
    expect(report.flaggedWardsReview).toContain(47);
    expect(report.flaggedWardsReview).toContain(116);
    expect(report.flaggedWardsReview).toContain(117);
    expect(report.flaggedWardsReview).toContain(118);
    expect(report.flaggedWardsReview).toContain(132);
    expect(report.flaggedWardsReview).toContain(135);
    expect(report.flaggedWardsReview).toContain(136);

    const ward47 = dataset.records.find((r) => r.ward_number === 47);
    expect(ward47?.verification_status).toBe("needs_review");
    expect(ward47?.councillor_name).toBeNull();

    const ward132 = dataset.records.find((r) => r.ward_number === 132);
    expect(ward132?.verification_status).toBe("needs_review");
    expect(ward132?.warnings[0]).toContain("HTML artifact");
  });

  it("ensures ZERO records are automatically marked as verified or approved", () => {
    const report = validateMunicipalityDataset(dataset);
    expect(report.automaticallyVerifiedCount).toBe(0);

    for (const rec of dataset.records) {
      expect(["pending", "needs_review"]).toContain(rec.verification_status);
      expect(rec.verification_status).not.toBe("approved");
      expect(rec.verification_status).not.toBe("imported");
    }
  });

  it("detects missing ward numbers when a ward is omitted", () => {
    const copy = {
      ...dataset,
      records: dataset.records.filter((r) => r.ward_number !== 25),
    };
    const report = validateMunicipalityDataset(copy);

    expect(report.isValid).toBe(false);
    expect(report.missingWardNumbers).toContain(25);
  });

  it("detects duplicate ward records", () => {
    const copy = {
      ...dataset,
      records: [...dataset.records, { ...dataset.records[0] }],
    };
    const report = validateMunicipalityDataset(copy);

    expect(report.isValid).toBe(false);
    expect(report.duplicateWardNumbers).toContain(dataset.records[0].ward_number);
  });
});
