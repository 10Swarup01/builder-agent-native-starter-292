import { defineEventHandler, setResponseStatus } from "h3";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export default defineEventHandler(async (event) => {
  await assertAdminUser(event);

  try {
    const admin = createSupabaseAdminClient();
    const { data: jobs, error } = await admin
      .from("municipality_import_jobs")
      .select("*, municipality_import_records(count)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setResponseStatus(event, 500);
      return { error: error.message };
    }

    return { jobs: jobs ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load jobs";
    setResponseStatus(event, 500);
    return { error: message };
  }
});
