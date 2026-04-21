import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { isActiveJob, countActiveJobs } from "@/lib/pipelineCounts";
import type { Job } from "@/types/jobTracker";

interface Props {
  jobs: Job[];
}

export default function ActiveOpportunitiesPanel({ jobs }: Props) {
  const navigate = useNavigate();

  const active = useMemo(() => {
    return jobs
      .filter(isActiveJob)
      .sort((a, b) => {
        const aTime = a.statusUpdatedAt ? new Date(a.statusUpdatedAt).getTime() : 0;
        const bTime = b.statusUpdatedAt ? new Date(b.statusUpdatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [jobs]);

  if (active.length === 0) return null;

  const totalActive = countActiveJobs(jobs);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Active opportunities</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{totalActive} in motion</p>
        </div>
        <button
          onClick={() => navigate("/jobs?status=active")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="divide-y divide-border/60">
        {active.map(job => (
          <button
            key={job.id}
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="-mx-2 flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{job.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {job.company}{job.location ? ` · ${job.location}` : ""}
              </p>
            </div>
            <StatusBadge status={job.status} />
          </button>
        ))}
      </div>
    </div>
  );
}
