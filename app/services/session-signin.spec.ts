import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => mockSupabase,
}));

import { afterSignInPath, safeNextPath } from "../lib/auth-navigation";
import { getAuthenticatedUser } from "./auth";
import { uploadReportImage } from "./report-images";

describe("Session Recovery and Sign-in Helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user directly when an active session exists", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-abc", email: "citizen@example.com" } } },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).toEqual({ id: "user-abc", email: "citizen@example.com" });
    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });

  it("transparently refreshes session when the access token has expired", async () => {
    // getSession returns no session (expired), but refreshSession recovers it
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { user: { id: "user-refreshed", email: "refreshed@example.com" } },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).toEqual({ id: "user-refreshed", email: "refreshed@example.com" });
    expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
  });

  it("returns null when user is a guest (no session and refresh fails)", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.refreshSession.mockResolvedValue({ data: { user: null }, error: new Error("No refresh token") });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Auth session missing") });

    const user = await getAuthenticatedUser();
    expect(user).toBeNull();
  });
});

describe("uploadReportImage Session Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for sign in when user is unauthenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.refreshSession.mockResolvedValue({ data: { user: null }, error: new Error("No token") });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No user") });

    const fakeFile = new File(["fake-image-bytes"], "waste.jpg", { type: "image/jpeg" });
    await expect(uploadReportImage(fakeFile)).rejects.toThrow(
      "Please sign in to upload photos and report waste.",
    );
  });

  it("uploads photo smoothly when user is authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });

    const fakeFile = new File(["fake-image-bytes"], "waste.png", { type: "image/png" });
    const uploadedPath = await uploadReportImage(fakeFile);
    expect(uploadedPath).toMatch(/^user-123\/[0-9a-f-]+\/[0-9a-f-]+\.png$/);
  });
});

describe("afterSignInPath Redirection", () => {
  it("safely accepts valid next route", () => {
    expect(safeNextPath("/report")).toBe("/report");
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
