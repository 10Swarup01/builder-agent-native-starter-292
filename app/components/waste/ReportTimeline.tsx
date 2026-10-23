import { IconCheck, IconCircleDashed, IconLoader2 } from "@tabler/icons-react";

import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportStatus, TimelineEvent, WasteReport } from "@/lib/waste";

const STATUS_STAGE: Record<ReportStatus, number> = {
  reported: 1,
  classified: 2,
  assigned: 3,
  in_progress: 4,
  resolved: 5,
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export function buildReportTimeline(report: WasteReport): TimelineEvent[] {
  const submitted = new Date(report.createdAt).getTime();
  const milestones = [
    { label: "Report Submitted", at: submitted },
    { label: "AI Classified", at: submitted + MINUTE },
    { label: "Assigned to Authority", at: submitted + 30 * MINUTE },
    { label: "In Progress", at: submitted + 22.5 * HOUR },
    { label: "Resolved", at: report.resolvedAt ? new Date(report.resolvedAt).getTime() : null },
  ];
  const reached = STATUS_STAGE[report.status];
  return milestones.map((milestone, index) => {
    const state: TimelineEvent["state"] = index < reached ? "done" : index === reached ? "current" : "pending";
    const time = state === "done" && milestone.at ? formatDayTime(new Date(milestone.at).toISOString()) : "Pending";
    return { label: milestone.label, time, state };
  });
}

export function ReportTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-6">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <li key={event.label} className="relative flex gap-4">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn("absolute left-[19px] top-10 h-[calc(100%+0.25rem)] w-0.5", event.state === "done" ? "bg-success" : "bg-border")}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                event.state === "done" && "bg-success text-white",
                event.state === "current" && "bg-warning/20 text-warning",
                event.state === "pending" && "border-2 border-dashed border-border bg-card text-muted-foreground",
              )}
            >
              {event.state === "done" ? <IconCheck size={18} aria-hidden="true" /> : null}
              {event.state === "current" ? <IconLoader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
              {event.state === "pending" ? <IconCircleDashed size={18} aria-hidden="true" /> : null}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="font-medium text-foreground">{event.label}</p>
              <p className="text-sm text-muted-foreground">
                {event.state === "current" ? "Current stage" : event.time}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
