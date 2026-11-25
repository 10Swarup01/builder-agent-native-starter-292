import { defineEventHandler, setResponseStatus } from "h3";
import dataset from "../../../../data/kmc-councillors-129.json";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { validateMunicipalityDataset } from "../../../../lib/municipality-dataset-validator";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export default defineEventHandler(async (event) => {
  const admin = await assertAdminUser(event);

  // Validate dataset first
  const report = validateMunicipalityDataset(dataset);
  if (!report.isValid) {
    setResponseStatus(event, 422);
    return {
      error: "Dataset validation failed",
      details: report.errors,
    };
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Create import job
  const { data: job, error: jobError } = await adminClient
    .from("municipality_import_jobs")
    .insert({
      created_by: admin.id,
      status: "completed",
      total_images: dataset.metadata.source_images_count,
      processed_images: dataset.metadata.source_images_count,
      failed_images: 0,
      total_records_extracted: dataset.records.length,
      error_log: [],
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    setResponseStatus(event, 500);
    return { error: `Failed to create import job: ${jobError?.message}` };
  }

  // 2. Prepare staging records (preserving original text, warnings, and review flags)
  const stagingRecords = dataset.records.map((rec: (typeof dataset.records)[number]) => ({
    job_id: job.id,
    state: dataset.metadata.state,
    district: dataset.metadata.district,
    municipality: dataset.metadata.municipality,
    municipality_type: dataset.metadata.municipality_type,
    ward_number: rec.ward_number,
    councillor_name: rec.councillor_name,
    office_address: rec.office_address,
    pin_code: rec.pin_code,
    contact_number: rec.contact_number,
    confidence: rec.confidence,
    original_text: `${rec.councillor_name ?? "-"} | ${rec.office_address ?? "-"} | ${rec.pin_code ?? "-"}`,
    verification_status: rec.verification_status, // "pending" or "needs_review", NEVER automatically approved
    warnings: rec.warnings,
  }));

  // Batch insert into municipality_import_records
  const { error: insertError } = await adminClient
    .from("municipality_import_records")
    .insert(stagingRecords);

  if (insertError) {
    setResponseStatus(event, 500);
    return { error: `Failed to stage records: ${insertError.message}` };
  }

  const flaggedCount = stagingRecords.filter((r: (typeof stagingRecords)[number]) => r.verification_status === "needs_review").length;

  return {
    success: true,
    jobId: job.id,
    totalRecords: stagingRecords.length,
    flaggedForReview: flaggedCount,
    metadata: dataset.metadata,
  };
});
