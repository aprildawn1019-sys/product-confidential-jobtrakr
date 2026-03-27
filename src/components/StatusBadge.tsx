import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/types/jobTracker";

const statusConfig: Record<JobStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" }> = {
  saved: { label: "Saved", variant: "secondary" },
  applied: { label: "Applied", variant: "info" },
  screening: { label: "Screening", variant: "warning" },
  interviewing: { label: "Interviewing", variant: "warning" },
  offer: { label: "Offer", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  withdrawn: { label: "Withdrawn", variant: "secondary" },
  closed: { label: "Closed", variant: "destructive" },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
