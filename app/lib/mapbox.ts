export const MAPBOX_ACCESS_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "").trim();

export type MapConfigIssue = "missing-token" | "secret-token";

export type MapStatus = "loading" | "ready" | "error" | "token-rejected" | "webgl-unsupported" | MapConfigIssue;

export function getMapboxConfigIssue(): MapConfigIssue | null {
  if (!MAPBOX_ACCESS_TOKEN) return "missing-token";
  if (MAPBOX_ACCESS_TOKEN.startsWith("sk.")) return "secret-token";
  return null;
}

export const MAP_STYLE_URLS = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

export type MapStyleMode = keyof typeof MAP_STYLE_URLS;

export const KOLKATA_CENTER = { latitude: 22.5726, longitude: 88.3639 } as const;
export const DEFAULT_MAP_ZOOM = 12;
export const LOCATE_ZOOM = 15;
export const ADDRESS_ZOOM = 16;

export const INDIA_COUNTRY_CODE = "in";

export function isValidCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  // Legacy rows were mapped to 0,0 when coordinates were missing, so that point is never a real report.
  return !(latitude === 0 && longitude === 0);
}
