import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Job, JobStatus } from "@/types/jobTracker";

const stages: { status: JobStatus; label: string; color: string }[] = [
  { status: "saved", label: "Saved", color: "bg-secondary" },
  { status: "applied", label: "Applied", color: "bg-info/60" },
  { status: "screening", label: "Screening", color: "bg-warning/60" },
  { status: "interviewing", label: "Interviewing", color: "bg-accent" },
  { status: "offer", label: "Offer", color: "bg-success" },
];

const terminalStages: { status: JobStatus; label: string }[] = [
  { status: "rejected", label: "Rejected" },
  { status: "withdrawn", label: "Withdrawn" },
  { status: "closed", label: "Closed" },
];

interface PipelineFunnelProps {
  jobs: Job[];
  onClickStage?: (status: string) => void;
}

export default function PipelineFunnel({ jobs, onClickStage }: PipelineFunnelProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) {
      map[j.status] = (map[j.status] || 0) + 1;
    }
    return map;
  }, [jobs]);

  const maxCount = Math.max(...stages.map(s => counts[s.status] || 0), 1);

  const terminalCounts = terminalStages
    .map(s => ({ ...s, count: counts[s.status] || 0 }))
    .filter(s => s.count > 0);

  return (
    <div className="w-full space-y-2">
      {/* Funnel bars */}
      <div className="flex items-end gap-1 h-10">
        {stages.map((stage) => {
          const count = counts[stage.status] || 0;
          const heightPct = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 12 : 4) : 4;

          return (
            <Tooltip key={stage.status}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onClickStage?.(stage.status)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                >
                  <div
                    className={`w-full rounded-t-sm transition-all ${stage.color} group-hover:opacity-80`}
                    style={{ height: `${heightPct}%`, minHeight: 2 }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{count}</span> {stage.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Labels row */}
      <div className="flex gap-1">
        {stages.map((stage) => {
          const count = counts[stage.status] || 0;
          return (
            <button
              key={stage.status}
              onClick={() => onClickStage?.(stage.status)}
              className="flex-1 text-center cursor-pointer hover:text-foreground transition-colors"
            >
              <span className="text-xs font-semibold block">{count}</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">{stage.label}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal statuses as small inline badges */}
      {terminalCounts.length > 0 && (
        <div className="flex items-center gap-3 pt-0.5">
          {terminalCounts.map(s => (
            <button
              key={s.status}
              onClick={() => onClickStage?.(s.status)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {s.count} {s.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
