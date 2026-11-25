import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => supabase,
}));

vi.mock("./demo", () => ({
  demoLatency: () => Promise.resolve(),
}));

import { DEMO_AUTHORITIES } from "@/lib/mock-data";
import { getAuthority, listAuthorities, matchAuthorityForLocation } from "./authorities";

describe("Authorities Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps and returns verified municipal authorities from Supabase", async () => {
    const mockDbRows = [
      {
        id: "auth-1",
        state: "West Bengal",
        district: "Kolkata",
        municipality: "Kolkata Municipal Corporation",
        municipality_type: "Municipal Corporation",
        ward_number: 16,
        councillor_name: "SHRI SWAPAN KUMAR DAS",
        councillor_name_bengali: "স্বপন কুমার দাস",
        designation: "Councillor",
        contact_number: "9830012345",
        alternate_contact_number: null,
        email: "ward16@kmcgov.in",
        office_address: "12, Karbala Tank Lane, Kolkata",
        pin_code: "700006",
        is_verified: true,
      },
    ];

    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockDbRows, error: null }),
        }),
      }),
    });

    const authorities = await listAuthorities();

    expect(authorities).toHaveLength(1);
    expect(authorities[0].id).toBe("auth-1");
    expect(authorities[0].name).toContain("SHRI SWAPAN KUMAR DAS");
    expect(authorities[0].name).toContain("স্বপন কুমার দাস");
    expect(authorities[0].ward).toBe("Ward 16");
    expect(authorities[0].phone).toBe("9830012345");
  });

  it("falls back to DEMO_AUTHORITIES when database returns empty array", async () => {
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    });

    const authorities = await listAuthorities();
    expect(authorities).toEqual(DEMO_AUTHORITIES);
  });

  it("falls back to DEMO_AUTHORITIES when database query errors", async () => {
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: new Error("relation not found") }),
        }),
      }),
    });

    const authorities = await listAuthorities();
    expect(authorities).toEqual(DEMO_AUTHORITIES);
  });

  it("loads single authority by id from Supabase", async () => {
    const mockRow = {
      id: "auth-single",
      state: "West Bengal",
      district: "Kolkata",
      municipality: "Kolkata Municipal Corporation",
      ward_number: 82,
      councillor_name: "FIRHAD HAKIM",
      councillor_name_bengali: null,
      designation: "Mayor & Councillor",
      contact_number: "9830099999",
      alternate_contact_number: null,
      email: null,
      office_address: "4, Peary Mohan Road, Alipore",
      pin_code: "700027",
      is_verified: true,
    };

    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockRow, error: null }),
        }),
      }),
    });

    const authority = await getAuthority("auth-single");
    expect(authority).toBeDefined();
    expect(authority?.name).toBe("FIRHAD HAKIM");
    expect(authority?.ward).toBe("Ward 82");
  });

  describe("matchAuthorityForLocation", () => {
    it("matches authority by explicit ward number in address", () => {
      const matched = matchAuthorityForLocation({
        address: "College Street, Ward 16, Kolkata",
      });
      expect(matched).toBeDefined();
      expect(matched?.wardNumber).toBe(16);
    });

    it("matches authority by 6-digit PIN code", () => {
      const matched = matchAuthorityForLocation({
        address: "Near Sealdah Railway Station, Kolkata, 700011, India",
      });
      expect(matched).toBeDefined();
      expect(matched?.officeAddress).toContain("700011");
    });

    it("matches authority by zone name for Thakurpukur / Maheshtala", () => {
      const matched = matchAuthorityForLocation({
        address: "Nungi More Daulatpur Rd, Thakurpukur Maheshtala community development block, 700140, India",
      });
      expect(matched).toBeDefined();
      expect([142, 143, 144]).toContain(matched?.wardNumber);
    });
  });
});
