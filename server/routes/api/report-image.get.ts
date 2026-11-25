import { defineEventHandler, getQuery, setResponseHeader, setResponseStatus } from "h3";
import { REPORT_IMAGE_BUCKET } from "../../../shared/report-photo";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";

const SAFE_PATH_PATTERN = /^[a-zA-Z0-9_\-\./]+$/;

function mimeTypeForPath(path: string, fallback?: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return fallback || "image/jpeg";
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawPath = typeof query.path === "string" ? query.path.trim() : "";

  if (!rawPath || rawPath.includes("..") || rawPath.startsWith("/") || !SAFE_PATH_PATTERN.test(rawPath)) {
    setResponseStatus(event, 400);
    return { error: "Invalid image path" };
  }

  try {
    const admin = createSupabaseAdminClient();

    // 1. Direct download: stream image buffer directly to client (bypasses RLS, private bucket restrictions, and CORS redirects)
    const { data: blob, error: downloadError } = await admin.storage
      .from(REPORT_IMAGE_BUCKET)
      .download(rawPath);

    if (!downloadError && blob) {
      setResponseHeader(event, "Content-Type", mimeTypeForPath(rawPath, blob.type));
      setResponseHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return Buffer.from(await blob.arrayBuffer());
    }

    // 2. Fallback: generate signed URL and fetch buffer server-side to avoid cross-origin client failures
    const { data: signData, error: signError } = await admin.storage
      .from(REPORT_IMAGE_BUCKET)
      .createSignedUrl(rawPath, 60 * 60 * 24);

    if (!signError && signData?.signedUrl) {
      try {
        const upstream = await fetch(signData.signedUrl);
        if (upstream.ok) {
          setResponseHeader(event, "Content-Type", mimeTypeForPath(rawPath, upstream.headers.get("content-type") || undefined));
          setResponseHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
          return Buffer.from(await upstream.arrayBuffer());
        }
      } catch (fetchErr) {
        console.warn("[api/report-image] Upstream signed URL fetch failed", fetchErr);
      }
    }

    setResponseStatus(event, 404);
    return { error: "Photo not found" };
  } catch (error) {
    console.error("[api/report-image] Unexpected error fetching photo", error);
    setResponseStatus(event, 500);
    return { error: "Failed to load photo" };
  }
});

