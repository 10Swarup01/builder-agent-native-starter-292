import { DEMO_USERS } from "@/lib/mock-data";

import { demoLatency } from "./demo";

export type UserRole = "citizen" | "authority" | "admin";

// TODO: Connect Supabase Auth — list users and roles from the profiles table for admins only.
export async function listUsers() {
  await demoLatency();
  return DEMO_USERS;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  reportsSubmitted: number;
  activeReports: number;
  resolvedReports: number;
}

// TODO: Connect Supabase Auth — return the real session user; sign-in and sign-up are not implemented yet.
export async function getCurrentUser(): Promise<CurrentUser> {
  await demoLatency();
  return {
    id: "demo-user",
    name: "Demo Citizen",
    email: "citizen@demo.invalid",
    phone: "+00 00000 00000",
    role: "admin",
    reportsSubmitted: 12,
    activeReports: 3,
    resolvedReports: 9,
  };
}
