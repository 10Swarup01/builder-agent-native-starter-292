import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { assertAdminUser } from "../../../../lib/admin-auth";
import { extractMunicipalityRecordsFromImage, MunicipalityExtractionError } from "../../../../lib/municipality-gemini";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const imageItemSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileName: z.string().default("councillor-roster.png"),
});

const extractRequestSchema = z.object({
  // Supports both batch of images or single image
  images: z.array(imageItemSchema).optional(),
  imageBase64: z.string().optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  fileName: z.string().optional(),
  metadataContext: z
    .object({
      state: z.string().optional(),
      district: z.string().optional(),
      municipality: z.string().optional(),
      municipality_type: z.string().optional(),
    })
    .optional(),
});

export default defineEventHandler(async (event) => {
  const admin = await assertAdminUser(event);

  const body = await readBody(event).catch(() => null);
  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) {
    setResponseStatus(event, 400);
    return { error: "Invalid image upload payload", details: parsed.error.issues.map((e) => e.message) };
  }

  const { metadataContext } = parsed.data;

  // Normalize images list
  const imageItems: Array<z.infer<typeof imageItemSchema>> = [];
  if (parsed.data.images && parsed.data.images.length > 0) {
    imageItems.push(...parsed.data.images);
  } else if (parsed.data.imageBase64 && parsed.data.mimeType) {
    imageItems.push({
      imageBase64: parsed.data.imageBase64,
      mimeType: parsed.data.mimeType,
      fileName: parsed.data.fileName || "councillor-roster.png",
    });
  }

  if (imageItems.length === 0) {
    setResponseStatus(event, 400);
    return { error: "At least one image is required for extraction." };
  }

  const adminClient = createSupabaseAdminClient();

  // Create an import job
  const { data: job, error: jobError } = await adminClient
    .from("municipality_import_jobs")
    .insert({
      created_by: admin.id,
      status: "processing",
      total_images: imageItems.length,
      processed_images: 0,
      failed_images: 0,
      total_records_extracted: 0,
      error_log: [],
    })
    .select("id")
    .single();

  if (jobError || !job) {
    setResponseStatus(event, 500);
    return { error: `Failed to create import job: ${jobError?.message}` };
  }

  let totalExtracted = 0;
  let processedCount = 0;
  let failedCount = 0;
  const errorLog: Array<{ fileName: string; error: string }> = [];

  // Sequential processing with error isolation to avoid rate-limit spikes and memory exhaustion
  for (let idx = 0; idx < imageItems.length; idx++) {
    const item = imageItems[idx];
    const imageBuffer = Buffer.from(item.imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");

    if (imageBuffer.length > 10 * 1024 * 1024) {
      failedCount++;
      errorLog.push({ fileName: item.fileName, error: "Image exceeds 10MB limit." });
      continue;
    }

    try {
      const extraction = await extractMunicipalityRecordsFromImage(imageBuffer, item.mimeType, metadataContext ?? {});

      // Record source image
      const { data: sourceImage } = await adminClient
        .from("municipality_source_images")
        .insert({
          job_id: job.id,
          file_name: item.fileName,
          storage_path: `import-sources/${job.id}/${item.fileName}`,
          page_number: idx + 1,
          status: "processed",
          raw_ocr_response: extraction,
        })
        .select("id")
        .maybeSingle();

      // Stage records
      const staged = extraction.records.map((rec: (typeof extraction.records)[number]) => {
        const hasIssues = rec.confidence < 0.85 || rec.warnings.length > 0 || !rec.councillor_name;
        return {
          job_id: job.id,
          source_image_id: sourceImage?.id ?? null,
          state: rec.state || "West Bengal",
          district: rec.district || metadataContext?.district || "Kolkata",
          municipality: rec.municipality || metadataContext?.municipality || "Kolkata Municipal Corporation",
          municipality_type: rec.municipality_type || metadataContext?.municipality_type || "Municipal Corporation",
          ward_number: rec.ward_number,
          councillor_name: rec.councillor_name,
          councillor_name_bengali: rec.councillor_name_bengali,
          designation: rec.designation || "Councillor",
          contact_number: rec.contact_number,
          alternate_contact_number: rec.alternate_contact_number,
          email: rec.email,
          office_address: rec.office_address,
          pin_code: rec.pin_code,
          original_text: rec.original_text,
          confidence: rec.confidence,
          verification_status: hasIssues ? "needs_review" : "pending",
          warnings: rec.warnings,
        };
      });

      if (staged.length > 0) {
        await adminClient.from("municipality_import_records").insert(staged);
        totalExtracted += staged.length;
      }
      processedCount++;
    } catch (err: unknown) {
      failedCount++;
      const errorMessage =
        err instanceof MunicipalityExtractionError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Extraction failed";
      errorLog.push({ fileName: item.fileName, error: errorMessage });
    }
  }

  const finalStatus =
    failedCount === 0 ? "completed" : processedCount > 0 ? "partial_failure" : "failed";

  await adminClient
    .from("municipality_import_jobs")
    .update({
      status: finalStatus,
      processed_images: processedCount,
      failed_images: failedCount,
      total_records_extracted: totalExtracted,
      error_log: errorLog,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return {
    success: finalStatus !== "failed",
    jobId: job.id,
    status: finalStatus,
    totalImages: imageItems.length,
    processedImages: processedCount,
    failedImages: failedCount,
    recordsExtracted: totalExtracted,
    errorLog,
  };
});
