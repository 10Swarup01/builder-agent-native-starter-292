import { H3Event } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

const mockAssertAdminUser = vi.hoisted(() => vi.fn());

vi.mock("../../../../lib/admin-auth", () => ({
  assertAdminUser: mockAssertAdminUser,
}));

vi.mock("../../../../lib/supabase-admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

import handler from "./bulk-import.post";

function createMockEvent(body: unknown, headers: Record<string, string> = {}) {
  const req = new Request("http://localhost/api/admin/municipality/bulk-import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return new H3Event(req);
}

describe("POST /api/admin/municipality/bulk-import", () => {
  const testAdmin = { id: "admin-uuid-1234", email: "admin@kolkata.gov.in", role: "admin" as const };
  const testJobId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertAdminUser.mockResolvedValue(testAdmin);
  });

  it("fails when caller is not an administrator", async () => {
    mockAssertAdminUser.mockRejectedValue(new Error("Unauthorized"));
    const event = createMockEvent({ jobId: testJobId });

    await expect(handler(event)).rejects.toThrow("Unauthorized");
  });

  it("ignores client-supplied adminUserId and uses verified admin credentials", async () => {
    const stagedRecords = [
      {
        id: "rec-1",
        state: "West Bengal",
        district: "Kolkata",
        municipality: "Kolkata Municipal Corporation",
        ward_number: 16,
        councillor_name: "SHRI SWAPAN KUMAR DAS",
        verification_status: "approved",
      },
    ];

    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    adminClient.from.mockImplementation((table: string) => {
      if (table === "municipality_import_records") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: stagedRecords, error: null }),
            }),
          }),
          update: updateMock,
        };
      }
      if (table === "municipal_authorities") {
        return {
          select: () => ({
            match: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          upsert: upsertMock,
        };
      }
      return {};
    });

    const event = createMockEvent({
      jobId: testJobId,
      adminUserId: "attacker-spoofed-id-9999", // Frontend attempts to spoof admin ID
    });

    const res = await handler(event);

    expect(res).toMatchObject({
      success: true,
      inserted: 1,
      importedBy: testAdmin.email,
    });

    // Verify update recorded real admin.id, NOT spoofed id
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewed_by: testAdmin.id,
        verification_status: "imported",
      }),
    );
  });

  it("prevents accidental overwriting of existing verified records when allowOverwriteVerified is false", async () => {
    const stagedRecords = [
      {
        id: "rec-2",
        state: "West Bengal",
        district: "Kolkata",
        municipality: "Kolkata Municipal Corporation",
        ward_number: 20,
        councillor_name: "NEW CANDIDATE",
        verification_status: "approved",
      },
    ];

    const existingVerified = {
      id: "auth-existing-1",
      is_verified: true,
      councillor_name: "ORIGINAL VERIFIED COUNCILLOR",
    };

    const upsertMock = vi.fn();

    adminClient.from.mockImplementation((table: string) => {
      if (table === "municipality_import_records") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: stagedRecords, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "municipal_authorities") {
        return {
          select: () => ({
            match: () => ({
              maybeSingle: () => Promise.resolve({ data: existingVerified, error: null }),
            }),
          }),
          upsert: upsertMock,
        };
      }
      return {};
    });

    const event = createMockEvent({
      jobId: testJobId,
      allowOverwriteVerified: false,
    });

    const res = await handler(event);

    expect(res).toMatchObject({
      success: true,
      inserted: 0,
      updated: 0,
      skipped: 1,
      skippedVerified: 1,
    });

    // Upsert must NOT be called for verified existing record
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("allows explicit administrator-approved overwrite when allowOverwriteVerified is true", async () => {
    const stagedRecords = [
      {
        id: "rec-3",
        state: "West Bengal",
        district: "Kolkata",
        municipality: "Kolkata Municipal Corporation",
        ward_number: 22,
        councillor_name: "UPDATED NAME APPROVED",
        verification_status: "approved",
      },
    ];

    const existingVerified = {
      id: "auth-existing-2",
      is_verified: true,
      councillor_name: "OLD NAME",
    };

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    adminClient.from.mockImplementation((table: string) => {
      if (table === "municipality_import_records") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: stagedRecords, error: null }),
            }),
          }),
          update: updateMock,
        };
      }
      if (table === "municipal_authorities") {
        return {
          select: () => ({
            match: () => ({
              maybeSingle: () => Promise.resolve({ data: existingVerified, error: null }),
            }),
          }),
          upsert: upsertMock,
        };
      }
      return {};
    });

    const event = createMockEvent({
      jobId: testJobId,
      allowOverwriteVerified: true, // Explicit admin confirmation
    });

    const res = await handler(event);

    expect(res).toMatchObject({
      success: true,
      inserted: 0,
      updated: 1,
      skipped: 0,
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ward_number: 22,
        councillor_name: "UPDATED NAME APPROVED",
        is_verified: true,
      }),
      { onConflict: "state,district,municipality,ward_number" },
    );
  });
});
