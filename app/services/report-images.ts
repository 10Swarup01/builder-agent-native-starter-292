import { getSupabaseBrowserClient } from "@/lib/supabase";

export const REPORT_IMAGE_BUCKET = "report-images";
export const REPORT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSION_BY_TYPE = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const UNSUPPORTED_TYPE_MESSAGE = "Please choose a JPG, PNG, or WEBP photo.";
const TOO_LARGE_MESSAGE = "That photo is larger than 10 MB. Choose a smaller photo.";
const INVALID_CONTENT_MESSAGE = "This file does not look like a valid JPG, PNG, or WEBP photo. Please choose another image.";
const UNREADABLE_MESSAGE = "This photo could not be read. Please choose another image.";
const UPLOAD_FAILED_MESSAGE = "Your photo could not be uploaded. Check your connection and try again.";
const SIGNED_OUT_MESSAGE = "You need to be signed in to upload a photo.";

function hasAsciiAt(bytes: Uint8Array, offset: number, text: string) {
  return [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}

async function detectImageType(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (hasAsciiAt(bytes, 0, "\u0089PNG\r\n\u001a\n")) return "image/png";
  if (hasAsciiAt(bytes, 0, "RIFF") && hasAsciiAt(bytes, 8, "WEBP")) return "image/webp";
  return null;
}

export async function validateReportImage(file: File): Promise<string | null> {
  if (!EXTENSION_BY_TYPE.has(file.type)) return UNSUPPORTED_TYPE_MESSAGE;
  if (file.size > REPORT_IMAGE_MAX_BYTES) return TOO_LARGE_MESSAGE;
  try {
    return (await detectImageType(file)) === file.type ? null : INVALID_CONTENT_MESSAGE;
  } catch {
    return UNREADABLE_MESSAGE;
  }
}

export async function uploadReportImage(file: File): Promise<string> {
  const problem = await validateReportImage(file);
  if (problem) throw new Error(problem);

  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(SIGNED_OUT_MESSAGE);

  const extension = EXTENSION_BY_TYPE.get(file.type);
  const path = `${userData.user.id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(REPORT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(UPLOAD_FAILED_MESSAGE);
  return path;
}
