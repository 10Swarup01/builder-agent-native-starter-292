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

  it("downloads buffer and streams it directly when available", async () => {
    const fakeBlob = {
      type: "image/jpeg",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };

    adminClient.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: fakeBlob,
        error: null,
      }),
      createSignedUrl: vi.fn(),
    });

    const event = createMockEvent({ path: "user/img.jpg" });
    const res = await handler(event);

    expect(adminClient.storage.from).toHaveBeenCalledWith("report-images");
    expect(Buffer.isBuffer(res)).toBe(true);
  });

  it("falls back to fetching signed URL upstream if download fails", async () => {
    const fakeBlob = {
      type: "image/jpeg",
      arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
    };

    adminClient.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Download failed"),
      }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://supabase.example/signed/user/img.jpg?token=abc" },
        error: null,
      }),
    });

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
    });
    vi.stubGlobal("fetch", globalFetch);

    const event = createMockEvent({ path: "user/img.jpg" });
    const res = await handler(event);

    expect(Buffer.isBuffer(res)).toBe(true);
    vi.unstubAllGlobals();
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
