import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
  storage: { from: vi.fn() },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => supabase,
}));

import { submitReport, type NewReportInput } from "./reports";
import { validateReportImage } from "./report-images";

const input: NewReportInput = {
  category: "plastic",
  description: "Bottles dumped near the drain",
  quantity: "medium",
  durationLabel: "Less than 1 day",
  blockingTraffic: false,
  sensitiveLocations: ["School"],
  location: { address: "12 Main Road", area: "", ward: "", latitude: 22.5, longitude: 88.3 },
  imagePath: "user-1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
};

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  supabase.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1 }, error: null }) }) }),
  }));
  supabase.storage.from.mockImplementation(() => ({
    createSignedUrls: async (paths: string[]) => ({
      data: paths.map((path) => ({ path, signedUrl: `https://signed.example/${path}` })),
      error: null,
    }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://public.example/${path}` },
    }),
  }));
  supabase.rpc.mockResolvedValue({
    data: [{ report_id: "report-1", report_number: "WW-2026-000001", created_at: "2026-11-15T10:00:00Z" }],
    error: null,
  });
});

describe("submitReport", () => {
  it("calls submit_waste_report with the existing argument set and no classification fields", async () => {
    await submitReport(input);

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("submit_waste_report", {
      p_category_id: 1,
      p_description: "Bottles dumped near the drain",
      p_quantity: "medium",
      p_duration: "Less than 1 day",
      p_blocking_traffic: false,
      p_sensitive_locations: ["School"],
      p_latitude: 22.5,
      p_longitude: 88.3,
      p_address: "12 Main Road",
      p_image_path: input.imagePath,
    });
  });

  it("returns the saved report with its generated number", async () => {
    const report = await submitReport(input);
    expect(report.reportNumber).toBe("WW-2026-000001");
    expect(report.status).toBe("reported");
    expect(report.category).toBe("plastic");
  });

  it("surfaces a clear error when the database rejects the submission", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "image_already_used" } });
    await expect(submitReport(input)).rejects.toThrow("Your waste report could not be saved. Please try again.");
  });

  it("falls back to /api/report-image proxy when createSignedUrls returns no signed URL", async () => {
    supabase.storage.from.mockImplementation(() => ({
      createSignedUrls: async (paths: string[]) => ({
        data: paths.map((path) => ({ path, signedUrl: null })),
        error: null,
      }),
    }));

    const report = await submitReport(input);
    expect(report.imageUrl).toBe(`/api/report-image?path=${encodeURIComponent(input.imagePath)}`);
  });

  it("surfaces an error when the database returns no row", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    await expect(submitReport(input)).rejects.toThrow("Your waste report could not be saved.");
  });
});

describe("validateReportImage", () => {
  it("accepts JPEG, PNG and WEBP up to the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateReportImage(new File([new Uint8Array(8)], "photo", { type }))).toBeNull();
    }
  });

  it("rejects other image formats", () => {
    expect(validateReportImage(new File([new Uint8Array(8)], "photo.gif", { type: "image/gif" }))).toBe(
      "Please choose a JPG, PNG or WEBP photo.",
    );
  });

  it("rejects files larger than 10 MB", () => {
    const large = new File([new Uint8Array(8)], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: 10 * 1024 * 1024 + 1 });
    expect(validateReportImage(large)).toBe("This photo is larger than 10 MB. Please choose a smaller one.");
  });
});
