import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ArrowRight } from "lucide-react";
import type { Interview, Job } from "@/types/jobTracker";

interface Props {
  interviews: Interview[];
  jobs: Job[];
}

function fmtDate(date: string, time?: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", weekday: "short" };
  return time ? `${d.toLocaleDateString(undefined, opts)} · ${time}` : d.toLocaleDateString(undefined, opts);
}

export default function UpcomingInterviewsStrip({ interviews, jobs }: Props) {
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return interviews
      .filter(i => i.status === "scheduled")
      .filter(i => {
        const t = new Date(i.date).getTime();
        return Number.isNaN(t) ? true : t >= now - 86_400_000; // include today
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [interviews]);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-warning" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming Interviews
          </h2>
        </div>
        <button
          onClick={() => navigate("/interviews")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {upcoming.map(iv => {
          const job = jobs.find(j => j.id === iv.jobId);
          return (
            <button
              key={iv.id}
              onClick={() => job && navigate(`/jobs/${job.id}`)}
              className="rounded-lg border border-border bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <p className="text-xs font-medium text-warning">{fmtDate(iv.date, iv.time)}</p>
              <p className="mt-1 truncate font-semibold text-sm">{job?.company || "Unknown company"}</p>
              <p className="truncate text-xs text-muted-foreground">{job?.title || ""} · {iv.type}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
