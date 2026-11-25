import { defineEventHandler, getQuery, setResponseStatus } from "h3";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export default defineEventHandler(async (event) => {
  await assertAdminUser(event);

  const query = getQuery(event);
  const jobId = typeof query.jobId === "string" ? query.jobId : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;

  try {
    const admin = createSupabaseAdminClient();
    let dbQuery = admin
      .from("municipality_import_records")
      .select("*")
      .order("ward_number", { ascending: true });

    if (jobId) {
      dbQuery = dbQuery.eq("job_id", jobId);
    }

    if (status && status !== "all") {
      dbQuery = dbQuery.eq("verification_status", status);
    }

    const { data: records, error } = await dbQuery.limit(500);

    if (error) {
      setResponseStatus(event, 500);
      return { error: error.message };
    }

    return { records: records ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load staging records";
    setResponseStatus(event, 500);
    return { error: message };
  }
});
