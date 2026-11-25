import { H3Event } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertAdminUser = vi.hoisted(() => vi.fn());
const mockAdminClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../../../lib/admin-auth", () => ({
  assertAdminUser: mockAssertAdminUser,
}));

vi.mock("../../../../lib/supabase-admin", () => ({
  createSupabaseAdminClient: () => mockAdminClient,
}));

import extractHandler from "./extract.post";
import jobsHandler from "./jobs.get";
import recordsGetHandler from "./records.get";
import recordsPatchHandler from "./records.patch";
import seedDatasetHandler from "./seed-dataset.post";

function createMockEvent(method: string, url: string, body?: unknown) {
  const req = new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return new H3Event(req);
}

describe("Municipality Admin API Endpoints - Authorization Enforcements", () => {
  const adminUser = { id: "admin-1", email: "admin@test.gov", role: "admin" as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/municipality/jobs", () => {
    it("rejects non-admin requests", async () => {
      mockAssertAdminUser.mockRejectedValue(new Error("Unauthorized: Admin privileges required"));
      const event = createMockEvent("GET", "/api/admin/municipality/jobs");

      await expect(jobsHandler(event)).rejects.toThrow("Unauthorized: Admin privileges required");
    });

    it("allows verified admin to fetch jobs", async () => {
      mockAssertAdminUser.mockResolvedValue(adminUser);
      mockAdminClient.from.mockReturnValue({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [{ id: "job-1", status: "completed" }], error: null }),
          }),
        }),
      });

      const event = createMockEvent("GET", "/api/admin/municipality/jobs");
      const res = await jobsHandler(event);

      expect(res).toEqual({ jobs: [{ id: "job-1", status: "completed" }] });
    });
  });

  describe("GET /api/admin/municipality/records", () => {
    it("rejects non-admin requests", async () => {
      mockAssertAdminUser.mockRejectedValue(new Error("Forbidden"));
      const event = createMockEvent("GET", "/api/admin/municipality/records?jobId=123");

      await expect(recordsGetHandler(event)).rejects.toThrow("Forbidden");
    });

    it("allows verified admin to fetch staging records", async () => {
      mockAssertAdminUser.mockResolvedValue(adminUser);
      mockAdminClient.from.mockReturnValue({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [{ id: "rec-1", ward_number: 16 }], error: null }),
          }),
        }),
      });

      const event = createMockEvent("GET", "/api/admin/municipality/records");
      const res = await recordsGetHandler(event);

      expect(res).toEqual({ records: [{ id: "rec-1", ward_number: 16 }] });
    });
  });

  describe("PATCH /api/admin/municipality/records", () => {
    it("rejects non-admin requests", async () => {
      mockAssertAdminUser.mockRejectedValue(new Error("Forbidden"));
      const event = createMockEvent("PATCH", "/api/admin/municipality/records", {
        id: "550e8400-e29b-41d4-a716-446655440000",
        verification_status: "approved",
      });

      await expect(recordsPatchHandler(event)).rejects.toThrow("Forbidden");
    });

    it("allows verified admin to update staging records", async () => {
      mockAssertAdminUser.mockResolvedValue(adminUser);
      mockAdminClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: "550e8400-e29b-41d4-a716-446655440000", verification_status: "approved" },
                error: null,
              }),
            }),
          }),
        }),
      });

      const event = createMockEvent("PATCH", "/api/admin/municipality/records", {
        id: "550e8400-e29b-41d4-a716-446655440000",
        verification_status: "approved",
      });

      const res = await recordsPatchHandler(event);
      expect(res).toMatchObject({ record: { id: "550e8400-e29b-41d4-a716-446655440000", verification_status: "approved" } });
    });
  });

  describe("POST /api/admin/municipality/seed-dataset", () => {
    it("rejects non-admin requests", async () => {
      mockAssertAdminUser.mockRejectedValue(new Error("Forbidden"));
      const event = createMockEvent("POST", "/api/admin/municipality/seed-dataset", {});

      await expect(seedDatasetHandler(event)).rejects.toThrow("Forbidden");
    });
  });

  describe("POST /api/admin/municipality/extract", () => {
    it("rejects non-admin requests", async () => {
      mockAssertAdminUser.mockRejectedValue(new Error("Forbidden"));
      const event = createMockEvent("POST", "/api/admin/municipality/extract", {
        images: [{ fileName: "kmc_ward.jpg", base64Data: "data:image/jpeg;base64,123", mimeType: "image/jpeg" }],
      });

      await expect(extractHandler(event)).rejects.toThrow("Forbidden");
    });
  });
});
