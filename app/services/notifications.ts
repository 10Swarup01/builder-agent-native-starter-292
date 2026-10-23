import { demoLatency } from "./demo";

export type NotificationType = "submitted" | "assigned" | "status" | "resolved" | "ai_review";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href: string;
}

const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "submitted", title: "New report submitted", body: "WM-2026-001245 was added to the queue.", time: "10 min ago", read: false, href: "/problems/WM-2026-001245" },
  { id: "n2", type: "assigned", title: "Report assigned", body: "WM-001244 was assigned to Demo Ward B.", time: "1 hr ago", read: false, href: "/problems/WM-001244" },
  { id: "n3", type: "status", title: "Report status changed", body: "WM-001245 moved to In Progress.", time: "3 hrs ago", read: true, href: "/problems/WM-001245" },
  { id: "n4", type: "resolved", title: "Report resolved", body: "WM-001242 was cleared. Before and after photos are available.", time: "Yesterday", read: true, href: "/resolved" },
  { id: "n5", type: "ai_review", title: "AI classification requires review", body: "WM-001250 has 63% confidence and needs a manual check.", time: "Yesterday", read: false, href: "/admin/ai-review" },
];

// TODO: Connect Supabase Realtime — push new notifications for the signed-in user.
export async function listNotifications(): Promise<AppNotification[]> {
  await demoLatency();
  return DEMO_NOTIFICATIONS;
}
