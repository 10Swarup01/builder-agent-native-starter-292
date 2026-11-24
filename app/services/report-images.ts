import { getSupabaseBrowserClient } from "@/lib/supabase";
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
  try {
    const { data, error } = await getSupabaseBrowserClient().storage.from(REPORT_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (err) {
    console.warn("[report-images] createSignedUrl failed, falling back to server image proxy", err);
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

  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session has expired. Please sign in again.");

  const extension = EXTENSIONS[file.type as ReportImageType];
  const path = `${userData.user.id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(REPORT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[report-images] upload rejected", {
      bucket: REPORT_IMAGE_BUCKET,
      host: new URL(import.meta.env.NEXT_PUBLIC_SUPABASE_URL).host,
      contentType: file.type,
      sizeBytes: file.size,
      pathShape: path.split("/").length,
      message: error.message,
      name: error.name,
    });
    throw new Error("Photo upload failed.");
  }
  return path;
}
