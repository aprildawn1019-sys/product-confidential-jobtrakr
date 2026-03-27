import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types/jobTracker";

export const statusStyles: Record<JobStatus, { label: string; className: string }> = {
  saved: {
    label: "Saved",
    className: "bg-secondary text-secondary-foreground border-border",
  },
  applied: {
    label: "Applied",
    className: "bg-info/15 text-info border-info/30",
  },
  screening: {
    label: "Screening",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  interviewing: {
    label: "Interviewing",
    className: "bg-accent/15 text-accent-foreground border-accent/30",
  },
  offer: {
    label: "Offer",
    className: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-muted text-muted-foreground border-border",
  },
  closed: {
    label: "Closed",
    className: "bg-destructive/10 text-destructive/70 border-destructive/20 line-through",
  },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const config = statusStyles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
