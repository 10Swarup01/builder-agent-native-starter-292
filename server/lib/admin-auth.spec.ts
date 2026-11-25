import { H3Event } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockProfileSelect = vi.hoisted(() => vi.fn());

vi.mock("./supabase-auth", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("./supabase-admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockProfileSelect,
        }),
      }),
    }),
  }),
}));

import { assertAdminUser } from "./admin-auth";

function createMockEvent(headers: Record<string, string> = {}) {
  const req = new Request("http://localhost/api/admin/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
  return new H3Event(req);
}

describe("Admin Role Authorization & Security (assertAdminUser)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth session missing" },
    });

    const event = createMockEvent();
    await expect(assertAdminUser(event)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  });

  it("rejects authenticated citizen with 403 Forbidden", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "citizen-user-1",
          email: "citizen@example.com",
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    mockProfileSelect.mockResolvedValue({
      data: { role: "citizen" },
      error: null,
    });

    const event = createMockEvent();
    await expect(assertAdminUser(event)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  });

  it("SECURITY TEST: blocks user self-promotion via user_metadata", async () => {
    // Malicious citizen called supabase.auth.updateUser({ data: { role: 'admin' } })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "malicious-user-2",
          email: "attacker@example.com",
          app_metadata: {}, // app_metadata is not admin
          user_metadata: { role: "admin" }, // User forged this in user_metadata!
        },
      },
      error: null,
    });

    // Database profile correctly shows citizen
    mockProfileSelect.mockResolvedValue({
      data: { role: "citizen" },
      error: null,
    });

    const event = createMockEvent();
    // Must be rejected with 403 Forbidden!
    await expect(assertAdminUser(event)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  });

  it("accepts authenticated administrator via public.profiles role", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-user-1",
          email: "admin@kolkata.gov.in",
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    mockProfileSelect.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const event = createMockEvent();
    const result = await assertAdminUser(event);

    expect(result).toEqual({
      id: "admin-user-1",
      email: "admin@kolkata.gov.in",
      role: "admin",
    });
  });

  it("accepts authenticated administrator via Supabase app_metadata (server-signed)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-user-2",
          email: "superadmin@kolkata.gov.in",
          app_metadata: { role: "admin" },
          user_metadata: {},
        },
      },
      error: null,
    });

    const event = createMockEvent();
    const result = await assertAdminUser(event);

    expect(result).toEqual({
      id: "admin-user-2",
      email: "superadmin@kolkata.gov.in",
      role: "admin",
    });
  });
});
