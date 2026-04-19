import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import type { Job } from "@/types/jobTracker";

interface Props {
  jobs: Job[];
}

const ACTIVE_STATUSES = ["applied", "screening", "interviewing", "offer"];

export default function ActiveOpportunitiesPanel({ jobs }: Props) {
  const navigate = useNavigate();

  const active = useMemo(() => {
    return jobs
      .filter(j => ACTIVE_STATUSES.includes(j.status))
      .sort((a, b) => {
        const aTime = a.statusUpdatedAt ? new Date(a.statusUpdatedAt).getTime() : 0;
        const bTime = b.statusUpdatedAt ? new Date(b.statusUpdatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [jobs]);

  if (active.length === 0) return null;

  const totalActive = jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-info" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active Opportunities
          </h2>
          <span className="text-xs text-muted-foreground">({totalActive})</span>
        </div>
        <button
          onClick={() => navigate("/jobs?status=active")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="divide-y divide-border">
        {active.map(job => (
          <button
            key={job.id}
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/30 transition-colors -mx-2 px-2 rounded"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{job.title}</p>
              <p className="truncate text-xs text-muted-foreground">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
            </div>
            <StatusBadge status={job.status} />
          </button>
        ))}
      </div>
    </div>
  );
}
