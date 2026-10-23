import type { ReportLocation } from "@/lib/waste";

import { demoLatency } from "./demo";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Location permission was denied or unavailable.")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// TODO: Connect Maps API — reverse-geocode coordinates to address, area and ward on the server.
export async function resolveLocation(point: GeoPoint): Promise<ReportLocation> {
  await demoLatency();
  return {
    address: "Demo location",
    area: "Demo area",
    ward: "Demo ward",
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

// TODO: Connect Maps API — replace with place search results.
export async function searchLocation(query: string): Promise<ReportLocation[]> {
  await demoLatency();
  if (!query.trim()) return [];
  return [
    { address: `Demo location matching "${query.trim()}"`, area: "Demo area", ward: "Demo ward", latitude: 22.5726, longitude: 88.3639 },
  ];
}
