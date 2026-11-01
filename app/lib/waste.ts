import {
  IconBattery2,
  IconDroplet,
  IconFlask,
  IconGlass,
  IconLeaf,
  IconPackage,
  IconRecycle,
  IconStethoscope,
  IconTool,
  IconTrash,
  type Icon,
} from "@tabler/icons-react";

export type WasteCategoryId =
  | "plastic"
  | "household"
  | "medical"
  | "chemical"
  | "liquid"
  | "ewaste"
  | "glass"
  | "metal"
  | "organic"
  | "mixed";

export type Severity = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "reported"
  | "classified"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

export type WasteQuantity = "small" | "medium" | "large" | "very_large";

export interface WasteCategoryMeta {
  id: WasteCategoryId;
  label: string;
  shortLabel: string;
  icon: Icon;
  chartVar: string;
}

export const WASTE_CATEGORIES: WasteCategoryMeta[] = [
  { id: "plastic", label: "Plastic Waste", shortLabel: "Plastic", icon: IconRecycle, chartVar: "chart-1" },
  { id: "household", label: "Household Waste", shortLabel: "Household", icon: IconTrash, chartVar: "chart-2" },
  { id: "medical", label: "Medical Waste", shortLabel: "Medical", icon: IconStethoscope, chartVar: "chart-5" },
  { id: "chemical", label: "Chemical Waste", shortLabel: "Chemical", icon: IconFlask, chartVar: "chart-6" },
  { id: "liquid", label: "Liquid / Water Waste", shortLabel: "Liquid", icon: IconDroplet, chartVar: "chart-4" },
  { id: "ewaste", label: "E-Waste", shortLabel: "E-Waste", icon: IconBattery2, chartVar: "chart-3" },
  { id: "glass", label: "Glass Waste", shortLabel: "Glass", icon: IconGlass, chartVar: "chart-4" },
  { id: "metal", label: "Metal Waste", shortLabel: "Metal", icon: IconTool, chartVar: "chart-8" },
  { id: "organic", label: "Organic Waste", shortLabel: "Organic", icon: IconLeaf, chartVar: "chart-2" },
  { id: "mixed", label: "Mixed / Unknown Waste", shortLabel: "Mixed", icon: IconPackage, chartVar: "chart-3" },
];

export function getCategory(id: WasteCategoryId): WasteCategoryMeta {
  return WASTE_CATEGORIES.find((category) => category.id === id) ?? WASTE_CATEGORIES[WASTE_CATEGORIES.length - 1];
}

export const SEVERITY_META: Record<Severity, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-info/10 text-info border-info/30" },
  medium: { label: "Medium", className: "bg-warning/15 text-warning border-warning/40" },
  high: { label: "High", className: "bg-danger/10 text-danger border-danger/30" },
  critical: { label: "Critical", className: "bg-danger text-white border-danger" },
};

export const STATUS_META: Record<ReportStatus, { label: string; className: string }> = {
  reported: { label: "Reported", className: "bg-muted text-foreground border-border" },
  classified: { label: "Classified", className: "bg-info/10 text-info border-info/30" },
  assigned: { label: "Assigned", className: "bg-chart-6/15 text-chart-6 border-chart-6/30" },
  in_progress: { label: "In Progress", className: "bg-warning/15 text-warning border-warning/40" },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-danger/10 text-danger border-danger/30" },
};

export const QUANTITY_OPTIONS: { value: WasteQuantity; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "very_large", label: "Very Large" },
];

export interface ReportLocation {
  address: string;
  area: string;
  ward: string;
  latitude: number;
  longitude: number;
}

export interface WasteReport {
  id: string;
  reportNumber: string;
  imageUrl?: string;
  afterImageUrl?: string;
  category: WasteCategoryId;
  aiConfidence: number;
  severity: Severity | null;
  status: ReportStatus;
  description: string;
  quantity: WasteQuantity;
  detectedItems: string[];
  blockingTraffic: boolean;
  durationLabel?: string;
  sensitiveLocations?: string[];
  location: ReportLocation;
  authorityId: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ReportStatusEntry {
  status: ReportStatus;
  note: string | null;
  createdAt: string;
}

export function formatReportLocation(location: ReportLocation): string {
  const parts = [location.address, location.area, location.ward].filter((part) => part.trim() !== "");
  return parts.length > 0 ? parts.join(", ") : "Location not provided";
}

export interface WasteAnalysis {
  category: WasteCategoryId;
  confidence: number;
  severity: Severity;
  detectedItems: string[];
}

export interface Authority {
  id: string;
  name: string;
  designation: string;
  ward: string;
  area: string;
  officeAddress: string;
  phone: string;
  email: string;
  isActive: boolean;
  activeReports: number;
  resolvedReports: number;
  averageResolutionHours: number;
}

export interface TimelineEvent {
  label: string;
  time: string;
  state: "done" | "current" | "pending";
  note?: string;
}
