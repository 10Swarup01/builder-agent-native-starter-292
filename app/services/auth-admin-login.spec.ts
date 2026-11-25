import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithPassword = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockProfileFrom = vi.hoisted(() => vi.fn());

const mockSupabase = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    getUser: mockGetUser,
  },
  from: mockProfileFrom,
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => mockSupabase,
}));

vi.mock("./reports", () => ({
  listOwnReports: () => Promise.resolve([]),
  summarizeReports: () => ({ totalReports: 0, activeProblems: 0, resolved: 0 }),
}));

vi.mock("@agent-native/core/client", () => ({
  signOut: () => Promise.resolve(),
}));

import { getCurrentUser, signInAsAdmin, signInWithPassword } from "./auth";

describe("Admin Login & Role Verification Authentication Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Citizen Login (signInWithPassword)", () => {
    it("successfully logs in a citizen user", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "citizen-1", email: "citizen@example.com" } },
        error: null,
      });

      await expect(signInWithPassword("citizen@example.com", "validPass123")).resolves.toBeUndefined();
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "citizen@example.com",
        password: "validPass123",
      });
    });

    it("throws friendly error for invalid credentials without leaking account type", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      await expect(signInWithPassword("unknown@example.com", "wrongPass")).rejects.toThrow(
        "Email or password is incorrect.",
      );
    });

    it("throws friendly error when email is unconfirmed", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Email not confirmed" },
      });

      await expect(signInWithPassword("newuser@example.com", "pass123")).rejects.toThrow(
        "Confirm your email first. Check your inbox for the confirmation link.",
      );
    });
  });

  describe("Admin Login (signInAsAdmin)", () => {
    it("successfully authenticates a valid administrator and returns verified admin profile", async () => {
      const adminUserId = "admin-uuid-100";
      const adminEmail = "admin@kolkata.gov.in";

      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: adminUserId,
            email: adminEmail,
            app_metadata: {},
          },
        },
        error: null,
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminUserId,
            email: adminEmail,
            app_metadata: {},
          },
        },
        error: null,
      });

      mockProfileFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  full_name: "Mayor Office Admin",
                  phone: "9830000000",
                  avatar_url: null,
                  role: "admin",
                },
                error: null,
              }),
          }),
        }),
      });

      const user = await signInAsAdmin(adminEmail, "SecretAdminPassword123");

      expect(user).toBeDefined();
      expect(user.role).toBe("admin");
      expect(user.email).toBe(adminEmail);
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it("CRITICAL TEST: immediately denies access and logs out citizen attempting Admin Login", async () => {
      const citizenUserId = "citizen-uuid-200";
      const citizenEmail = "citizen@example.com";

      // Citizen enters valid password
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: citizenUserId,
            email: citizenEmail,
            app_metadata: {},
          },
        },
        error: null,
      });

      // But their profile role in DB is citizen!
      mockProfileFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  full_name: "Regular Citizen",
                  phone: "9876543210",
                  avatar_url: null,
                  role: "citizen",
                },
                error: null,
              }),
          }),
        }),
      });

      // Must be rejected with specific access denied error
      await expect(signInAsAdmin(citizenEmail, "CitizenPass123")).rejects.toThrow(
        "This account does not have administrator access.",
      );

      // Must have signed them back out immediately so no admin or normal session lingers
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("rejects admin login on invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      await expect(signInAsAdmin("fakeadmin@gov.in", "badpassword")).rejects.toThrow(
        "Email or password is incorrect.",
      );
      expect(mockProfileFrom).not.toHaveBeenCalled();
    });

    it("authenticates admin verified via Supabase Auth app_metadata", async () => {
      const adminUserId = "admin-uuid-300";
      const adminEmail = "sysadmin@kolkata.gov.in";

      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: adminUserId,
            email: adminEmail,
            app_metadata: { role: "admin" },
          },
        },
        error: null,
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminUserId,
            email: adminEmail,
            app_metadata: { role: "admin" },
          },
        },
        error: null,
      });

      mockProfileFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  full_name: "System Admin",
                  phone: null,
                  avatar_url: null,
                  role: "citizen", // Even if profile says citizen, app_metadata has admin
                },
                error: null,
              }),
          }),
        }),
      });

      const user = await signInAsAdmin(adminEmail, "SysAdminPass123");
      expect(user.role).toBe("admin");
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe("Session Profile Fetch (getCurrentUser)", () => {
    it("returns correct role when user is an administrator", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-400",
            email: "admin4@kolkata.gov.in",
            app_metadata: {},
          },
        },
        error: null,
      });

      mockProfileFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  full_name: "Admin User",
                  phone: "1234567890",
                  avatar_url: null,
                  role: "admin",
                },
                error: null,
              }),
          }),
        }),
      });

      const user = await getCurrentUser();
      expect(user.role).toBe("admin");
      expect(user.email).toBe("admin4@kolkata.gov.in");
    });

    it("throws when user is not signed in", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session missing" },
      });

      await expect(getCurrentUser()).rejects.toThrow("You are not signed in.");
    });
  });
});
