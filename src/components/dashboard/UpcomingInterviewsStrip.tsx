import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Circle } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import type { Interview, Job } from "@/types/jobTracker";

interface Props {
  interviews: Interview[];
  jobs: Job[];
}

/** Format e.g. "Tue · 2:30 PM" or "Tue · Oct 28". */
function fmtWhen(date: string, time?: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  if (time) return `${day} · ${time}`;
  return `${day} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/**
 * Spec source: src/assets/dashboard-mockup.jpg.
 * Vertical list of upcoming interviews — one row per item with avatar +
 * company/role + amber circle on the right (matches Next steps row visually).
 * Renders even when empty so the two-column dashboard layout stays balanced.
 */
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
      .slice(0, 4);
  }, [interviews]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Upcoming interviews</h2>
        {interviews.some(i => i.status === "scheduled") && (
          <button
            onClick={() => navigate("/interviews")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing on the calendar yet.
        </p>
      ) : (
        <div className="space-y-1">
          {upcoming.map(iv => {
            const job = jobs.find(j => j.id === iv.jobId);
            const company = job?.company ?? "Interview";
            const subtitle = `${job?.title ?? iv.type} · ${fmtWhen(iv.date, iv.time)}`;
            return (
              <button
                key={iv.id}
                onClick={() => job && navigate(`/jobs/${job.id}`)}
                className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <CompanyAvatar company={company} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{company}</p>
                  <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                </div>
                {/* Amber outlined circle — matches the right-side affordance in the mockup. */}
                <Circle className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
