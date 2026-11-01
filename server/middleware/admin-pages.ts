import { defineEventHandler, getRequestURL, sendRedirect } from "h3";

import { getSupabaseAdminAccess } from "../lib/supabase-auth";

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return;

  const access = await getSupabaseAdminAccess(event);
  if (access === "admin") return;
  if (access === "signed-out") return sendRedirect(event, "/login", 302);
  return sendRedirect(event, "/", 302);
});
