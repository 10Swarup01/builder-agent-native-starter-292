import { INDIA_COUNTRY_CODE, KOLKATA_CENTER, MAPBOX_ACCESS_TOKEN, isValidCoordinate } from "@/lib/mapbox";

const GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PlaceResult extends GeoPoint {
  id: string;
  address: string;
  area: string;
}

export type GeolocationAccess = PermissionState | "unsupported";

export async function getGeolocationAccess(): Promise<GeolocationAccess> {
  if (!navigator.geolocation) return "unsupported";
  if (!navigator.permissions) return "prompt";
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    return "prompt";
  }
}

function describeGeolocationError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is blocked for this site. Allow location in your browser's site settings, or search for an address.";
  }
  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Try again, or search for an address.";
  }
  return "Your device could not determine its location. Check that location services are on, or search for an address.";
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(describeGeolocationError(error))),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

interface GeocodeFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    mapbox_id?: string;
    full_address?: string;
    name?: string;
    place_formatted?: string;
    context?: {
      neighborhood?: { name?: string };
      locality?: { name?: string };
      place?: { name?: string };
    };
  };
}

function toPlace(feature: GeocodeFeature): PlaceResult | null {
  const properties = feature.properties;
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  if (!properties || !isValidCoordinate(latitude, longitude) || latitude === undefined || longitude === undefined) return null;
  const address = properties.full_address ?? [properties.name, properties.place_formatted].filter(Boolean).join(", ");
  if (!address) return null;
  return {
    id: properties.mapbox_id ?? `${latitude},${longitude}`,
    address,
    area: properties.context?.neighborhood?.name ?? properties.context?.locality?.name ?? properties.context?.place?.name ?? "",
    latitude,
    longitude,
  };
}

async function requestGeocode(endpoint: "forward" | "reverse", params: Record<string, string>, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = new URL(`${GEOCODING_URL}/${endpoint}`);
  const allParams = { ...params, language: "en", access_token: MAPBOX_ACCESS_TOKEN };
  for (const [key, value] of Object.entries(allParams)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Mapbox geocoding failed with status ${response.status}`);
  const body = (await response.json()) as { features?: GeocodeFeature[] };
  return (body.features ?? []).flatMap((feature) => toPlace(feature) ?? []);
}

export function searchLocation(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  return requestGeocode(
    "forward",
    {
      q: query.trim(),
      country: INDIA_COUNTRY_CODE,
      proximity: `${KOLKATA_CENTER.longitude},${KOLKATA_CENTER.latitude}`,
      autocomplete: "true",
      limit: "6",
    },
    signal,
  );
}

export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<PlaceResult | null> {
  const [place] = await requestGeocode(
    "reverse",
    {
      longitude: String(point.longitude),
      latitude: String(point.latitude),
      country: INDIA_COUNTRY_CODE,
      limit: "1",
    },
    signal,
  );
  return place ?? null;
}
