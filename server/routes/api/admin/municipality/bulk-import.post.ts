import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const bulkImportRequestSchema = z.object({
  jobId: z.string().uuid(),
  recordIds: z.array(z.string().uuid()).optional(),
  allowOverwriteVerified: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  // 1. Enforce server-side administrator authorization (DO NOT trust client-sent admin IDs)
  const admin = await assertAdminUser(event);

  // 2. Validate request body
  const body = await readBody(event).catch(() => null);
  const parsed = bulkImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return {
      error: "Invalid request payload",
      details: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  const { jobId, recordIds, allowOverwriteVerified } = parsed.data;
  const supabaseAdmin = createSupabaseAdminClient();

  // 3. Query approved records for this job
  let query = supabaseAdmin
    .from("municipality_import_records")
    .select("*")
    .eq("job_id", jobId)
    .eq("verification_status", "approved");

  if (recordIds && recordIds.length > 0) {
    query = query.in("id", recordIds);
  }

  const { data: approvedRecords, error: fetchError } = await query;

  if (fetchError) {
    setResponseStatus(event, 500);
    return { error: `Failed to fetch approved staging records: ${fetchError.message}` };
  }

  if (!approvedRecords || approvedRecords.length === 0) {
    return {
      success: true,
      inserted: 0,
      updated: 0,
      skipped: 0,
      skippedVerified: 0,
      totalApproved: 0,
      message: "No approved records found to import.",
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let skippedVerified = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < approvedRecords.length; i += BATCH_SIZE) {
    const batch = approvedRecords.slice(i, i + BATCH_SIZE);

    for (const rec of batch) {
      if (!rec.ward_number || !rec.councillor_name) {
        skipped++;
        continue;
      }

      // Check if existing record exists in production
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("municipal_authorities")
        .select("id, is_verified, councillor_name")
        .match({
          state: rec.state,
          district: rec.district,
          municipality: rec.municipality,
          ward_number: rec.ward_number,
        })
        .maybeSingle();

      if (existingError) {
        console.warn(`[bulk-import] Could not check existing authority for ward ${rec.ward_number}:`, existingError);
      }

      // Prevent accidental overwriting of existing verified records unless explicitly approved
      if (existing && existing.is_verified && !allowOverwriteVerified) {
        skippedVerified++;
        skipped++;
        continue;
      }

      const payload = {
        state: rec.state,
        district: rec.district,
        municipality: rec.municipality,
        municipality_type: rec.municipality_type || "Municipal Corporation",
        ward_number: rec.ward_number,
        councillor_name: rec.councillor_name,
        councillor_name_bengali: rec.councillor_name_bengali || null,
        designation: rec.designation || "Councillor",
        contact_number: rec.contact_number || null,
        alternate_contact_number: rec.alternate_contact_number || null,
        email: rec.email || null,
        office_address: rec.office_address || null,
        pin_code: rec.pin_code || null,
        extra_details: rec.extra_details || {},
        source_image_id: rec.source_image_id || null,
        import_job_id: jobId,
        // When explicitly approved and bulk-imported by a verified admin, it becomes verified
        is_verified: true,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabaseAdmin
        .from("municipal_authorities")
        .upsert(payload, { onConflict: "state,district,municipality,ward_number" });

      if (!upsertErr) {
        if (existing) {
          updated++;
        } else {
          inserted++;
        }

        // Record who approved & imported this record
        await supabaseAdmin
          .from("municipality_import_records")
          .update({
            verification_status: "imported",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", rec.id);
      } else {
        console.error(`[bulk-import] Failed to upsert authority ward ${rec.ward_number}:`, upsertErr);
        skipped++;
      }
    }
  }

  return {
    success: true,
    inserted,
    updated,
    skipped,
    skippedVerified,
    totalApproved: approvedRecords.length,
    importedBy: admin.email,
  };
});
