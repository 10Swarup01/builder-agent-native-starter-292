import { createAuthPlugin } from "@agent-native/core/server";

import { getSupabaseSession } from "../lib/supabase-auth";

export default createAuthPlugin({
  rootAuth: false,
  mountGoogleOAuthRoutes: false,
  getSession: getSupabaseSession,
});
