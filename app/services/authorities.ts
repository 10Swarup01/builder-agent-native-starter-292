import { DEMO_AUTHORITIES } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Authority } from "@/lib/waste";
import kmcData from "../../server/data/kmc-councillors-129.json";

import { demoLatency } from "./demo";

export interface MunicipalAuthorityRow {
  id: string;
  state: string;
  district: string;
  municipality: string;
  municipality_type: string;
  ward_number: number;
  councillor_name: string;
  councillor_name_bengali: string | null;
  designation: string;
  contact_number: string | null;
  alternate_contact_number: string | null;
  email: string | null;
  office_address: string | null;
  pin_code: string | null;
  is_verified: boolean;
}

export function mapAuthorityRow(row: MunicipalAuthorityRow): Authority {
  const bengaliSuffix = row.councillor_name_bengali ? ` (${row.councillor_name_bengali})` : "";
  const phone = row.contact_number || row.alternate_contact_number || "Not listed";
  return {
    id: row.id,
    name: `${row.councillor_name}${bengaliSuffix}`,
    designation: row.designation || "Ward Councillor",
    ward: `Ward ${row.ward_number}`,
    area: `${row.municipality}, ${row.district}`,
    district: row.district,
    municipality: row.municipality,
    wardNumber: row.ward_number,
    officeAddress: row.office_address ? `${row.office_address}${row.pin_code ? ` - ${row.pin_code}` : ""}` : "Office address not listed",
    phone,
    email: row.email || "Not listed",
    isActive: row.is_verified,
    isVerified: row.is_verified,
    activeReports: 0,
    resolvedReports: 0,
    averageResolutionHours: 0,
  };
}

export const BUILTIN_KMC_AUTHORITIES: Authority[] = ((kmcData as { records?: Array<{ ward_number: number; councillor_name: string; office_address?: string | null; pin_code?: string | null; contact_number?: string | null }> }).records || []).map((r) => ({
  id: `kmc-ward-${r.ward_number}`,
  name: r.councillor_name,
  designation: "Ward Councillor",
  ward: `Ward ${r.ward_number}`,
  area: "Kolkata Municipal Corporation",
  district: "Kolkata",
  municipality: "Kolkata Municipal Corporation",
  wardNumber: r.ward_number,
  officeAddress: r.office_address || "Office address not listed",
  phone: r.contact_number || "Contact via KMC Central (1440)",
  email: `ward${r.ward_number}@kmcgov.in`,
  isActive: true,
  isVerified: true,
  activeReports: 0,
  resolvedReports: 0,
  averageResolutionHours: 0,
}));

// Known Kolkata municipal zone mapping for accurate auto-assignment
const ZONE_WARD_MAPPING: { name: string; wards: number[] }[] = [
  { name: "thakurpukur", wards: [144, 143, 142] },
  { name: "maheshtala", wards: [141, 140, 139] },
  { name: "metiabruz", wards: [135, 136, 137] },
  { name: "garden reach", wards: [133, 134, 135] },
  { name: "joka", wards: [143, 144] },
  { name: "behala", wards: [118, 119, 120, 121, 122, 130, 131, 132] },
  { name: "sealdah", wards: [49, 50, 56, 29] },
  { name: "alipore", wards: [74, 82] },
  { name: "bhowanipore", wards: [70, 71, 72, 73] },
  { name: "tollygunge", wards: [89, 94, 95] },
  { name: "jadavpur", wards: [96, 102] },
  { name: "garia", wards: [110, 111] },
  { name: "salt lake", wards: [28, 29, 30] },
  { name: "budge budge", wards: [137, 138, 139, 140] },
  { name: "nadial", wards: [138, 141] },
  { name: "haridevpur", wards: [142, 143] },
  { name: "kasba", wards: [67, 91, 107] },
];

/**
 * Automatically matches a municipal authority from database records based on location
 * (address text, pin code, ward number, or zone).
 */
export function matchAuthorityForLocation(
  location: { address?: string; area?: string; ward?: string; latitude?: number; longitude?: number },
  authorities?: Authority[],
): Authority | undefined {
  const pool = authorities && authorities.length > 0 ? authorities : BUILTIN_KMC_AUTHORITIES;
  if (!pool || pool.length === 0) return undefined;

  const address = (location.address || "").toLowerCase();
  const area = (location.area || "").toLowerCase();
  const wardInput = (location.ward || "").toLowerCase();
  const combined = `${address} ${area} ${wardInput}`;

  // 1. Explicit ward number match (e.g., "Ward 144", "Ward 16", "Ward-122", "w144")
  const wardMatch = combined.match(/\b(?:ward|w)[-.\s#]*([0-9]{1,3})\b/i);
  if (wardMatch) {
    const wardNum = parseInt(wardMatch[1], 10);
    const byWard =
      pool.find((a) => a.wardNumber === wardNum || a.ward?.toLowerCase().includes(`ward ${wardNum}`)) ||
      BUILTIN_KMC_AUTHORITIES.find((a) => a.wardNumber === wardNum);
    if (byWard) return byWard;
  }

  // 2. Exact PIN code match (e.g., 700006, 700018, 700104, 700140)
  const pinMatch = combined.match(/\b(7[0-9]{5})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    const byPin =
      pool.find((a) => a.officeAddress?.includes(pin)) ||
      BUILTIN_KMC_AUTHORITIES.find((a) => a.officeAddress?.includes(pin));
    if (byPin) return byPin;
  }

  // 3. Keyword / zone matching (e.g. Thakurpukur, Maheshtala, Sealdah, etc.)
  for (const z of ZONE_WARD_MAPPING) {
    if (combined.includes(z.name)) {
      const byZone =
        pool.find((a) => a.wardNumber !== undefined && z.wards.includes(a.wardNumber)) ||
        BUILTIN_KMC_AUTHORITIES.find((a) => z.wards.includes(a.wardNumber!));
      if (byZone) return byZone;
    }
  }

  // 4. Fallback: match by area or municipality name substring
  for (const a of pool) {
    if (a.area && combined.includes(a.area.toLowerCase())) return a;
    if (a.municipality && combined.includes(a.municipality.toLowerCase())) return a;
  }

  // 5. Default fallback to first available authority
  return pool[0] || BUILTIN_KMC_AUTHORITIES[0];
}

/**
 * Loads verified municipal authorities from Supabase.
 * Falls back to DEMO_AUTHORITIES if the table is empty or pending migration execution.
 */
export async function listAuthorities(): Promise<Authority[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const selectQuery = supabase.from("municipal_authorities").select("*");
    const eqQuery = typeof (selectQuery as any)?.eq === "function" ? (selectQuery as any).eq("is_verified", true) : selectQuery;
    const finalQuery = typeof (eqQuery as any)?.order === "function" ? (eqQuery as any).order("ward_number", { ascending: true }) : eqQuery;
    const { data, error } = await finalQuery;

    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as unknown as MunicipalAuthorityRow[]).map(mapAuthorityRow);
    }
  } catch (err) {
    console.warn("[authorities] Could not query municipal_authorities from Supabase, using fallback data", err);
  }

  await demoLatency();
  return DEMO_AUTHORITIES;
}

export async function getAuthority(id: string): Promise<Authority | undefined> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("municipal_authorities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return mapAuthorityRow(data as unknown as MunicipalAuthorityRow);
    }
  } catch (err) {
    console.warn("[authorities] Could not query authority by id from Supabase, using fallback data", err);
  }

  await demoLatency();
  return (
    DEMO_AUTHORITIES.find((authority) => authority.id === id) ||
    BUILTIN_KMC_AUTHORITIES.find((authority) => authority.id === id)
  );
}
