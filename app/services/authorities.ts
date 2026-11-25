import { DEMO_AUTHORITIES } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Authority } from "@/lib/waste";

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

/**
 * Loads verified municipal authorities from Supabase.
 * Falls back to DEMO_AUTHORITIES if the table is empty or pending migration execution.
 */
export async function listAuthorities(): Promise<Authority[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("municipal_authorities")
      .select("*")
      .eq("is_verified", true)
      .order("ward_number", { ascending: true });

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
  return DEMO_AUTHORITIES.find((authority) => authority.id === id);
}
