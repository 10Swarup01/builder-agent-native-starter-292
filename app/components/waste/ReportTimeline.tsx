import { IconCheck, IconCircleDashed, IconLoader2 } from "@tabler/icons-react";

import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportStatus, ReportStatusEntry, TimelineEvent, WasteReport } from "@/lib/waste";

const STAGES: { status: ReportStatus; label: string }[] = [
  { status: "reported", label: "Reported" },
  { status: "classified", label: "Classified" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In Progress" },
  { status: "resolved", label: "Resolved" },
];

export function buildReportTimeline(report: WasteReport, history: ReportStatusEntry[]): TimelineEvent[] {
  const reachedIndex = STAGES.findIndex((stage) => stage.status === report.status);
  const events: TimelineEvent[] = STAGES.map((stage, index) => {
    const entry = history.find((item) => item.status === stage.status);
    const at = stage.status === "reported" ? report.createdAt : stage.status === "resolved" ? report.resolvedAt : entry?.createdAt;
    const state: TimelineEvent["state"] =
      index < reachedIndex || (report.status === "resolved" && index === reachedIndex)
        ? "done"
        : index === reachedIndex
          ? "current"
          : "pending";
    return {
      label: stage.label,
      state,
      time: state === "pending" ? "Pending" : at ? formatDayTime(at) : "Date not available",
      note: entry?.note ?? undefined,
    };
  });

  if (report.status === "rejected") {
    const entry = history.find((item) => item.status === "rejected");
    events.push({
      label: "Rejected",
      state: "current",
      time: entry ? formatDayTime(entry.createdAt) : "Date not available",
      note: entry?.note ?? undefined,
    });
  }
  return events;
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
              <p className="text-sm text-muted-foreground">{event.time}</p>
              {event.state === "current" ? <p className="text-xs font-medium text-warning">Current stage</p> : null}
              {event.note ? <p className="text-sm text-muted-foreground">{event.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
