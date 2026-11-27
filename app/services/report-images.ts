import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/services/auth";
import { REPORT_IMAGE_BUCKET, REPORT_IMAGE_MAX_BYTES, REPORT_IMAGE_TYPES, type ReportImageType } from "../../shared/report-photo";

const EXTENSIONS: Record<ReportImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getReportPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("/")) {
    return path;
  }
  return `/api/report-image?path=${encodeURIComponent(path)}`;
}

export function validateReportImage(file: File): string | null {
  if (!(REPORT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPG, PNG or WEBP photo.";
  }
  if (file.size > REPORT_IMAGE_MAX_BYTES) {
    return "This photo is larger than 10 MB. Please choose a smaller one.";
  }
  return null;
}

export async function uploadReportImage(file: File): Promise<string> {
  const validationError = validateReportImage(file);
  if (validationError) throw new Error(validationError);

  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Please sign in to upload photos and report waste.");

  const supabase = getSupabaseBrowserClient();
  const extension = EXTENSIONS[file.type as ReportImageType];
  const path = `${user.id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
  let uploadResult = await supabase.storage.from(REPORT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  // If upload failed due to an expired token, attempt session recovery and retry once
  if (
    uploadResult.error &&
    (uploadResult.error.message?.toLowerCase().includes("jwt") ||
      (uploadResult.error as { statusCode?: string | number }).statusCode === 401 ||
      (uploadResult.error as { statusCode?: string | number }).statusCode === "401")
  ) {
    const refreshed = await getAuthenticatedUser();
    if (refreshed) {
      uploadResult = await supabase.storage.from(REPORT_IMAGE_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
    }
  }

  if (uploadResult.error) {
    console.error("[report-images] upload rejected", {
      bucket: REPORT_IMAGE_BUCKET,
      host: new URL(import.meta.env.NEXT_PUBLIC_SUPABASE_URL).host,
      contentType: file.type,
      sizeBytes: file.size,
      pathShape: path.split("/").length,
      message: uploadResult.error.message,
      name: uploadResult.error.name,
    });
    if (
      uploadResult.error.message?.toLowerCase().includes("jwt") ||
      (uploadResult.error as { statusCode?: string | number }).statusCode === 401 ||
      (uploadResult.error as { statusCode?: string | number }).statusCode === "401"
    ) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw new Error("Photo upload failed. Please try again.");
  }
  return path;
}
