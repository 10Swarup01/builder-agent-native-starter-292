import { defineEventHandler, getQuery, sendRedirect, setResponseHeader, setResponseStatus } from "h3";
import { REPORT_IMAGE_BUCKET } from "../../../shared/report-photo";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";

const SAFE_PATH_PATTERN = /^[a-zA-Z0-9_\-\./]+$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawPath = typeof query.path === "string" ? query.path.trim() : "";

  if (!rawPath || rawPath.includes("..") || rawPath.startsWith("/") || !SAFE_PATH_PATTERN.test(rawPath)) {
    setResponseStatus(event, 400);
    return { error: "Invalid image path" };
  }

  try {
    const admin = createSupabaseAdminClient();

    // 1. Generate signed URL with 24h validity using service role (bypasses RLS & private bucket restrictions)
    const { data: signData, error: signError } = await admin.storage
      .from(REPORT_IMAGE_BUCKET)
      .createSignedUrl(rawPath, 60 * 60 * 24);

    if (!signError && signData?.signedUrl) {
      setResponseHeader(event, "Cache-Control", "public, max-age=3600, s-maxage=86400");
      return sendRedirect(event, signData.signedUrl, 307);
    }

    // 2. Fallback: download file buffer directly and stream it
    const { data: blob, error: downloadError } = await admin.storage
      .from(REPORT_IMAGE_BUCKET)
      .download(rawPath);

    if (downloadError || !blob) {
      setResponseStatus(event, 404);
      return { error: "Photo not found" };
    }

    setResponseHeader(event, "Content-Type", blob.type || "image/jpeg");
    setResponseHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400");
    return Buffer.from(await blob.arrayBuffer());
  } catch (error) {
    console.error("[api/report-image] Unexpected error fetching photo", error);
    setResponseStatus(event, 500);
    return { error: "Failed to load photo" };
  }
});
