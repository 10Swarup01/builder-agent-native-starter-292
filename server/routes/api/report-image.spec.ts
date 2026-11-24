import { H3Event } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminClient = vi.hoisted(() => ({
  storage: {
    from: vi.fn(),
  },
}));

vi.mock("../../lib/supabase-admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

import handler from "./report-image.get";

function createMockEvent(query: Record<string, string> = {}) {
  const params = new URLSearchParams(query).toString();
  const url = `http://localhost/api/report-image${params ? `?${params}` : ""}`;
  return new H3Event(new Request(url));
}

describe("GET /api/report-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when path is missing", async () => {
    const event = createMockEvent({});
    const res = await handler(event);
    expect(res).toEqual({ error: "Invalid image path" });
  });

  it("returns 400 when path contains directory traversal", async () => {
    const event = createMockEvent({ path: "../../../etc/passwd" });
    const res = await handler(event);
    expect(res).toEqual({ error: "Invalid image path" });
  });

  it("returns 400 when path starts with slash", async () => {
    const event = createMockEvent({ path: "/foo/bar.jpg" });
    const res = await handler(event);
    expect(res).toEqual({ error: "Invalid image path" });
  });

  it("redirects with 307 when signedUrl is generated successfully", async () => {
    adminClient.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://supabase.example/signed/user/img.jpg?token=abc" },
        error: null,
      }),
      download: vi.fn(),
    });

    const event = createMockEvent({ path: "user/img.jpg" });
    const res = await handler(event);

    expect(adminClient.storage.from).toHaveBeenCalledWith("report-images");
    expect(res).toBeDefined();
  });

  it("falls back to downloading buffer if signedUrl generation fails", async () => {
    const fakeBlob = {
      type: "image/jpeg",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };

    adminClient.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Signing failed"),
      }),
      download: vi.fn().mockResolvedValue({
        data: fakeBlob,
        error: null,
      }),
    });

    const event = createMockEvent({ path: "user/img.jpg" });
    const res = await handler(event);

    expect(Buffer.isBuffer(res)).toBe(true);
  });

  it("returns 404 when photo does not exist in storage", async () => {
    adminClient.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      }),
      download: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      }),
    });

    const event = createMockEvent({ path: "user/missing.jpg" });
    const res = await handler(event);

    expect(res).toEqual({ error: "Photo not found" });
  });
});
