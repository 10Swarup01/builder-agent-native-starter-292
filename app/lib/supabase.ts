import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  // Codes are exchanged explicitly on /auth/callback, so the client must not consume them on load.
  client ??= createBrowserClient(url, anonKey, { auth: { detectSessionInUrl: false } });
  return client;
}
