import { getSupabaseBrowserClient } from "@/lib/supabase";

export const REPORT_IMAGE_BUCKET = "report-images";
export const REPORT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSIONS: Record<(typeof REPORT_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

  const extension = EXTENSIONS[file.type as (typeof REPORT_IMAGE_TYPES)[number]];
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
