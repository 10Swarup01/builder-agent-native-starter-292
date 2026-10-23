import { DEMO_AUTHORITIES } from "@/lib/mock-data";
import type { Authority } from "@/lib/waste";

import { demoLatency } from "./demo";

// TODO: Connect Supabase — load authorities and ward assignments from the database.
export async function listAuthorities(): Promise<Authority[]> {
  await demoLatency();
  return DEMO_AUTHORITIES;
}

export async function getAuthority(id: string): Promise<Authority | undefined> {
  await demoLatency();
  return DEMO_AUTHORITIES.find((authority) => authority.id === id);
}
