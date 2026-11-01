import type { AuthSession } from "@agent-native/core/server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { getHeader, setCookie, type H3Event } from "h3";

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; // guard:allow-env-credential — public Supabase project URL, shipped to browsers by design.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // guard:allow-env-credential — public Supabase anon key, shipped to browsers by design.
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  return { url, anonKey };
}

export function createSupabaseServerClient(event: H3Event) {
  const { url, anonKey } = requireSupabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => parseCookieHeader(getHeader(event, "cookie") ?? ""),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(event, name, value, options);
        }
      },
    },
  });
}

export async function getSupabaseSession(event: H3Event): Promise<AuthSession | null> {
  const { data, error } = await createSupabaseServerClient(event).auth.getUser();
  if (error || !data.user?.email) return null;

  const fullName = data.user.user_metadata?.full_name;
  return {
    email: data.user.email,
    userId: data.user.id,
    name: typeof fullName === "string" ? fullName : undefined,
    emailVerified: Boolean(data.user.email_confirmed_at),
  };
}

export async function getSupabaseAdminAccess(event: H3Event): Promise<"signed-out" | "forbidden" | "admin"> {
  const { data, error } = await createSupabaseServerClient(event).auth.getUser();
  if (error || !data.user) return "signed-out";
  return data.user.app_metadata?.role === "admin" ? "admin" : "forbidden";
}
