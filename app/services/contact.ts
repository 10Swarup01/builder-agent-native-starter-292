import { DEMO_DEVELOPER_CONTACT } from "@/lib/mock-data";

import { demoLatency } from "./demo";

export interface ContactChannel {
  id: "email" | "instagram" | "linkedin" | "x" | "whatsapp" | "website";
  label: string;
  description: string;
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  { id: "email", label: "Email", description: "Questions, feedback and project enquiries." },
  { id: "instagram", label: "Instagram", description: "Project updates and community stories." },
  { id: "linkedin", label: "LinkedIn", description: "Collaboration and professional contact." },
  { id: "x", label: "X", description: "Short updates and announcements." },
  { id: "whatsapp", label: "WhatsApp Community", description: "Join the community chat for reporting tips." },
  { id: "website", label: "Website", description: "Project information and documentation." },
];

// TODO: Connect Supabase — load these links from the admin-managed developer contact settings.
export async function getContactChannels(): Promise<ContactChannel[]> {
  await demoLatency();
  return CONTACT_CHANNELS;
}

// TODO: Connect Supabase — load and save developer contact fields from the admin settings table.
export async function getDeveloperContact() {
  await demoLatency();
  return DEMO_DEVELOPER_CONTACT;
}
