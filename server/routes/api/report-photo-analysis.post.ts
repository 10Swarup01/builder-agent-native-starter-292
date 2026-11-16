import { defineEventHandler, readBody, setResponseHeader, setResponseStatus } from "h3";
import { z } from "zod";

import { REPORT_IMAGE_BUCKET, REPORT_IMAGE_MAX_BYTES } from "../../../shared/report-photo";
import { createSupabaseServerClient } from "../../lib/supabase-auth";
import type { WasteAnalysis } from "../../../shared/waste-analysis";
import {
  analyzeWastePhoto,
  detectReportImageType,
  parseStoredWasteAnalysis,
  readGeminiConfig,
  WastePhotoError,
  type WastePhotoErrorCode,
} from "../../lib/waste-photo-analysis";

const RATE_LIMIT_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const requestSchema = z.object({
  imagePath: z.string().regex(new RegExp(`^${UUID}/${UUID}/${UUID}\\.(jpg|png|webp)$`)),
});

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new WastePhotoError("unauthorized");
    const userId = userData.user.id;

    const parsed = requestSchema.safeParse(await readBody(event).catch(() => null));
    if (!parsed.success) throw new WastePhotoError("invalid_request");
    const { imagePath } = parsed.data;
    if (imagePath.split("/")[0] !== userId) throw new WastePhotoError("forbidden_image");

    const cached = await findSucceededAnalysis(supabase, imagePath);
    if (cached) return cached;

    const config = readGeminiConfig(process.env);
    await assertWithinRateLimit(supabase);

    const bytes = await downloadPhoto(supabase, imagePath);
    const mimeType = detectReportImageType(bytes);
    if (!mimeType) throw new WastePhotoError("unsupported_image");

    const analysis = await analyzeWastePhoto({ bytes, mimeType }, config).catch(async (error: unknown) => {
      if (error instanceof WastePhotoError) {
        await recordAttempt(supabase, { userId, imagePath, model: config.model, analysis: null, errorCode: error.code }).catch(() => undefined);
      }
      throw error;
    });

    const analyzedAt = await recordAttempt(supabase, { userId, imagePath, model: config.model, analysis, errorCode: null });
    return { analysis, model: config.model, analyzedAt, cached: false };
  } catch (error) {
    if (error instanceof WastePhotoError) {
      setResponseStatus(event, error.statusCode);
      return { errorCode: error.code, message: error.message };
    }
    console.error("[waste-photo-analysis] unexpected failure", error);
    setResponseStatus(event, 500);
    return { errorCode: "internal_error", message: "Something went wrong while analyzing the photo. Please try again." };
  }
});

async function findSucceededAnalysis(supabase: SupabaseServerClient, imagePath: string) {
  const { data, error } = await supabase
    .from("report_photo_analyses")
    .select("analysis, model, created_at")
    .eq("image_path", imagePath)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[waste-photo-analysis] could not read earlier analysis", error.message);
    throw new WastePhotoError("storage_unavailable");
  }
  if (!data) return null;
  const analysis = parseStoredWasteAnalysis(data.analysis);
  if (!analysis) return null;
  return { analysis, model: data.model, analyzedAt: data.created_at, cached: true };
}

async function assertWithinRateLimit(supabase: SupabaseServerClient) {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await supabase
    .from("report_photo_analyses")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) {
    console.error("[waste-photo-analysis] could not count recent analyses", error.message);
    throw new WastePhotoError("storage_unavailable");
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) throw new WastePhotoError("rate_limited");
}

async function downloadPhoto(supabase: SupabaseServerClient, imagePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(REPORT_IMAGE_BUCKET).download(imagePath);
  if (error || !data) {
    const statusCode = Number((error as { statusCode?: unknown } | null)?.statusCode);
    console.error("[waste-photo-analysis] photo download failed", { statusCode });
    throw new WastePhotoError(statusCode === 400 || statusCode === 404 ? "image_not_found" : "storage_unavailable");
  }
  if (data.size > REPORT_IMAGE_MAX_BYTES) throw new WastePhotoError("image_too_large");
  return new Uint8Array(await data.arrayBuffer());
}

interface AttemptRecord {
  userId: string;
  imagePath: string;
  model: string;
  analysis: WasteAnalysis | null;
  errorCode: WastePhotoErrorCode | null;
}

async function recordAttempt(supabase: SupabaseServerClient, attempt: AttemptRecord): Promise<string> {
  const { data, error } = await supabase
    .from("report_photo_analyses")
    .insert({
      user_id: attempt.userId,
      image_path: attempt.imagePath,
      model: attempt.model,
      status: attempt.analysis ? "succeeded" : "failed",
      analysis: attempt.analysis,
      error_code: attempt.errorCode,
    })
    .select("created_at")
    .single();
  if (error || !data) {
    console.error("[waste-photo-analysis] could not record analysis attempt", error?.message);
    throw new WastePhotoError("save_failed");
  }
  return data.created_at as string;
}
