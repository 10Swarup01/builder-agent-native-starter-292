export const REPORT_IMAGE_BUCKET = "report-images";
export const REPORT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ReportImageType = (typeof REPORT_IMAGE_TYPES)[number];
