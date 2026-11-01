import { getSupabaseBrowserClient } from "@/lib/supabase";
import { REPORT_IMAGE_BUCKET } from "@/services/report-images";
import {
  getCategory,
  WASTE_CATEGORIES,
  type ReportLocation,
  type ReportStatus,
  type ReportStatusEntry,
  type Severity,
  type WasteCategoryId,
  type WasteQuantity,
  type WasteReport,
} from "@/lib/waste";

export interface NewReportInput {
  category: WasteCategoryId;
  description: string;
  quantity: WasteQuantity;
  durationLabel: string;
  blockingTraffic: boolean;
  sensitiveLocations: string[];
  location: ReportLocation;
  imagePath: string;
}

const SIGNED_URL_SECONDS = 60 * 60;

interface ReportRow {
  id: string;
  report_number: string;
  category_id: number | null;
  description: string | null;
  quantity: WasteQuantity | null;
  blocking_traffic: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  severity: Severity | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  duration: string | null;
  sensitive_locations: string[] | null;
  waste_categories: { name: string } | null;
  report_images: { image_url: string; image_type: string | null }[];
}

const REPORT_SELECT =
  "id, report_number, category_id, description, quantity, blocking_traffic, latitude, longitude, address, severity, status, created_at, resolved_at, duration, sensitive_locations, waste_categories(name), report_images(image_url, image_type)";

function categoryIdFromName(name: string | null | undefined): WasteCategoryId {
  return (["plastic", "household", "medical", "chemical", "liquid", "ewaste", "glass", "metal", "organic", "mixed"] as const).find(
    (id) => getCategory(id).label === name,
  ) ?? "mixed";
}

async function signedImageUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await getSupabaseBrowserClient().storage.from(REPORT_IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error || !data) throw new Error("Could not load report photos.");
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

async function toWasteReports(rows: ReportRow[]): Promise<WasteReport[]> {
  const imagePaths = rows.flatMap((row) => row.report_images.map((image) => image.image_url));
  const urls = await signedImageUrls(imagePaths);
  return rows.map((row) => {
    const original = row.report_images.find((image) => image.image_type === "original") ?? row.report_images[0];
    const resolution = row.report_images.find((image) => image.image_type === "resolution");
    return {
      id: row.id,
      reportNumber: row.report_number,
      imageUrl: original ? urls.get(original.image_url) : undefined,
      afterImageUrl: resolution ? urls.get(resolution.image_url) : undefined,
      category: categoryIdFromName(row.waste_categories?.name),
      aiConfidence: 0,
      severity: row.severity,
      status: row.status,
      description: row.description ?? "",
      quantity: row.quantity ?? "medium",
      detectedItems: [],
      blockingTraffic: row.blocking_traffic,
      durationLabel: row.duration ?? undefined,
      sensitiveLocations: row.sensitive_locations ?? [],
      location: {
        address: row.address ?? "",
        area: "",
        ward: "",
        latitude: row.latitude ?? 0,
        longitude: row.longitude ?? 0,
      },
      authorityId: "",
      createdAt: row.created_at,
      resolvedAt: row.resolved_at ?? undefined,
    };
  });
}

export async function listReports(): Promise<WasteReport[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("reports")
    .select(REPORT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load waste reports.");
  return toWasteReports((data ?? []) as unknown as ReportRow[]);
}

export async function listOwnReports(): Promise<WasteReport[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session has expired. Please sign in again.");
  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your reports.");
  return toWasteReports((data ?? []) as unknown as ReportRow[]);
}

export async function getReport(reportNumber: string): Promise<WasteReport | undefined> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("reports")
    .select(REPORT_SELECT)
    .eq("report_number", reportNumber)
    .maybeSingle();
  if (error) throw new Error("Could not load this waste report.");
  if (!data) return undefined;
  const [report] = await toWasteReports([data as unknown as ReportRow]);
  return report;
}

export function summarizeReports(reports: WasteReport[]) {
  const totalReports = reports.length;
  const resolved = reports.filter((report) => report.status === "resolved").length;
  const activeProblems = totalReports - resolved;
  const inProgress = reports.filter((report) => report.status === "in_progress").length;
  const resolutionRate = totalReports === 0 ? 0 : Math.round((resolved / totalReports) * 1000) / 10;
  const categoryCounts = Object.fromEntries(WASTE_CATEGORIES.map((category) => [category.id, 0])) as Record<WasteCategoryId, number>;
  for (const report of reports) categoryCounts[report.category] += 1;
  return { totalReports, activeProblems, inProgress, resolved, resolutionRate, categoryCounts };
}

export async function listActiveReports(): Promise<WasteReport[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("reports")
    .select(REPORT_SELECT)
    .not("status", "in", "(resolved,rejected)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load active waste problems.");
  return toWasteReports((data ?? []) as unknown as ReportRow[]);
}

export async function listResolvedReports(): Promise<WasteReport[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("reports")
    .select(REPORT_SELECT)
    .eq("status", "resolved")
    .order("resolved_at", { ascending: false });
  if (error) throw new Error("Could not load resolved waste problems.");
  return toWasteReports((data ?? []) as unknown as ReportRow[]);
}

interface StatusHistoryRow {
  new_status: ReportStatus;
  note: string | null;
  created_at: string;
}

export async function getReportStatusHistory(reportId: string): Promise<ReportStatusEntry[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("report_status_history")
    .select("new_status, note, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load the report timeline.");
  return ((data ?? []) as unknown as StatusHistoryRow[]).map((row) => ({
    status: row.new_status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

async function resolveCategoryId(category: WasteCategoryId): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("waste_categories")
    .select("id")
    .eq("name", getCategory(category).label)
    .maybeSingle();
  if (error || !data) throw new Error("Waste category is unavailable.");
  return data.id as number;
}

export async function submitReport(input: NewReportInput): Promise<WasteReport> {
  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session has expired. Please sign in again.");

  const categoryId = await resolveCategoryId(input.category);
  const { data, error } = await supabase.rpc("submit_waste_report", {
    p_category_id: categoryId,
    p_description: input.description,
    p_quantity: input.quantity,
    p_duration: input.durationLabel,
    p_blocking_traffic: input.blockingTraffic,
    p_sensitive_locations: input.sensitiveLocations,
    p_latitude: input.location.latitude,
    p_longitude: input.location.longitude,
    p_address: input.location.address,
    p_image_path: input.imagePath,
  });
  const inserted = Array.isArray(data) ? data[0] : undefined;
  if (error || !inserted?.report_id || !inserted.report_number || !inserted.created_at) {
    throw new Error("Your waste report could not be saved. Please try again.");
  }

  const [report] = await toWasteReports([
    {
      id: inserted.report_id,
      report_number: inserted.report_number,
      category_id: categoryId,
      description: input.description,
      quantity: input.quantity,
      blocking_traffic: input.blockingTraffic,
      duration: input.durationLabel,
      sensitive_locations: input.sensitiveLocations,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      address: input.location.address,
      severity: null,
      status: "reported",
      created_at: inserted.created_at,
      resolved_at: null,
      waste_categories: { name: getCategory(input.category).label },
      report_images: [{ image_url: input.imagePath, image_type: "original" }],
    },
  ]);
  return report;
}
