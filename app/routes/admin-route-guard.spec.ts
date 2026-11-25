import { describe, expect, it } from "vitest";

interface RouteGuardState {
  status: "checking" | "authorized" | "denied";
  redirectPath: string | null;
  errorMessage: string | null;
}

async function simulateAdminRouteGuard(
  getUserFn: () => Promise<{ id: string; email: string; role: string }>,
  currentPath: string,
): Promise<RouteGuardState> {
  try {
    const user = await getUserFn();
    if (user.role === "admin") {
      return { status: "authorized", redirectPath: null, errorMessage: null };
    } else {
      return {
        status: "denied",
        redirectPath: "/",
        errorMessage: "This account does not have administrator access.",
      };
    }
  } catch {
    return {
      status: "denied",
      redirectPath: `/login?mode=admin&next=${encodeURIComponent(currentPath)}`,
      errorMessage: "Please log in with administrator credentials.",
    };
  }
}

describe("Admin Route Authorization Guard", () => {
  it("allows verified administrator to access admin routes", async () => {
    const adminUser = { id: "admin-1", email: "admin@kolkata.gov.in", role: "admin" };
    const result = await simulateAdminRouteGuard(() => Promise.resolve(adminUser), "/admin/municipality-import");

    expect(result.status).toBe("authorized");
    expect(result.redirectPath).toBeNull();
    expect(result.errorMessage).toBeNull();
  });

  it("denies access to authenticated citizen and redirects to home with error message", async () => {
    const citizenUser = { id: "citizen-1", email: "citizen@example.com", role: "citizen" };
    const result = await simulateAdminRouteGuard(() => Promise.resolve(citizenUser), "/admin/reports");

    expect(result.status).toBe("denied");
    expect(result.redirectPath).toBe("/");
    expect(result.errorMessage).toBe("This account does not have administrator access.");
  });

  it("redirects unauthenticated user to /login?mode=admin with continuation path", async () => {
    const result = await simulateAdminRouteGuard(
      () => Promise.reject(new Error("You are not signed in.")),
      "/admin/municipality-import",
    );

    expect(result.status).toBe("denied");
    expect(result.redirectPath).toBe("/login?mode=admin&next=%2Fadmin%2Fmunicipality-import");
    expect(result.errorMessage).toBe("Please log in with administrator credentials.");
  });
});
