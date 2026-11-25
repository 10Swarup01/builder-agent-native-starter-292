import { createAuthPlugin } from "@agent-native/core/server";

import { getSupabaseSession } from "../lib/supabase-auth";

const PUBLIC_CIVIC_PATHS = [
  "/",
  "/report",
  "/problems",
  "/resolved",
  "/map",
  "/authorities",
  "/forecast",
  "/analytics",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/confirm",
];

export default createAuthPlugin({
  rootAuth: false,
  mountGoogleOAuthRoutes: false,
  getSession: getSupabaseSession,
  publicPaths: PUBLIC_CIVIC_PATHS,
  workspaceAppPublicPaths: PUBLIC_CIVIC_PATHS,
  workspaceAppProtectedPaths: ["/admin", "/profile"],
});
