import { createError, getHeader, type H3Event } from "h3";
import { createSupabaseAdminClient } from "./supabase-admin";
import { createSupabaseServerClient } from "./supabase-auth";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: "admin";
}

/**
 * Validates that the request comes from an authenticated user with administrator privileges.
 * NEVER trusts user-supplied admin IDs from request bodies or parameters.
 */
export async function assertAdminUser(event: H3Event): Promise<AuthenticatedAdmin> {
  // Test/mocking support for deterministic unit tests
  if (process.env.NODE_ENV === "test") {
    const testAdminHeader = getHeader(event, "x-test-admin-id");
    if (testAdminHeader) {
      return { id: testAdminHeader, email: "admin@test.invalid", role: "admin" };
    }
  }

  const supabase = createSupabaseServerClient(event);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Authentication required to access administrator operations.",
    });
  }

  const user = userData.user;

  // 1. Check JWT app_metadata (set strictly server-side by Supabase Admin, never user_metadata which is user-editable)
  if (user.app_metadata?.role === "admin") {
    return { id: user.id, email: user.email ?? "", role: "admin" };
  }

  // 2. Check public.profiles in database using service role client
  try {
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      return { id: user.id, email: user.email ?? "", role: "admin" };
    }
  } catch (err) {
    console.warn("[admin-auth] Profiles role check failed:", err);
  }

  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    message: "Administrator privileges required to perform this action.",
  });
}
