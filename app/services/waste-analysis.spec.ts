import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeReportPhoto } from "./waste-analysis";

const analysis = {
  is_waste: true,
  image_quality: "clear",
  primary_category: "Medical Waste",
  detected_items: ["Syringes"],
  confidence: 91,
  severity: "Critical",
  description: "Used syringes on a footpath.",
  environmental_risks: ["Needlestick injury"],
  disposal_recommendation: "Report to the authority for medical waste collection.",
  requires_special_handling: true,
  additional_notes: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeReportPhoto", () => {
  it("posts the storage path and maps the category for a valid response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { analysis, model: "gemini-test", analyzedAt: "2026-11-15T10:00:00Z", cached: false }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeReportPhoto("user-1/a/b.jpg");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/report-photo-analysis",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ imagePath: "user-1/a/b.jpg" }) }),
    );
    expect(result.categoryId).toBe("medical");
    expect(result.analysis.severity).toBe("Critical");
  });

  it("shows the server's user-facing message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(503, { errorCode: "provider_unavailable", message: "AI photo analysis is temporarily unavailable." })),
    );
    await expect(analyzeReportPhoto("user-1/a/b.jpg")).rejects.toThrow("AI photo analysis is temporarily unavailable.");
  });

  it("falls back to a safe message when a failure body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 })));
    await expect(analyzeReportPhoto("user-1/a/b.jpg")).rejects.toThrow("You can still choose the category yourself.");
  });

  it("rejects a success body whose category is not in the allowed list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { analysis: { ...analysis, primary_category: "Hazardous" }, analyzedAt: "x" })),
    );
    await expect(analyzeReportPhoto("user-1/a/b.jpg")).rejects.toThrow("You can still choose the category yourself.");
  });

  it("rejects a success body missing required analysis fields", async () => {
    const { description: _omitted, ...incomplete } = analysis;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { analysis: incomplete, analyzedAt: "x" })));
    await expect(analyzeReportPhoto("user-1/a/b.jpg")).rejects.toThrow("You can still choose the category yourself.");
  });

  it("explains a network failure without exposing details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(analyzeReportPhoto("user-1/a/b.jpg")).rejects.toThrow("We could not reach the photo analysis service.");
  });
});
