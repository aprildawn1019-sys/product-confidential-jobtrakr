import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { Job, Interview } from "@/types/jobTracker";

interface ApplicationsProps {
  jobs: Job[];
  interviews: Interview[];
}

const interviewTypeLabel: Record<Interview["type"], string> = {
  phone: "📞 Phone Screen",
  technical: "💻 Technical",
  behavioral: "🗣️ Behavioral",
  onsite: "🏢 On-site",
  final: "🎯 Final Round",
};

export default function Applications({ jobs, interviews }: ApplicationsProps) {
  const appliedJobs = jobs.filter(j => j.status !== "saved");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Applications & Interviews</h1>
        <p className="mt-1 text-muted-foreground">Track your progress through the pipeline</p>
      </div>

      <div className="space-y-4">
        {appliedJobs.map(job => {
          const jobInterviews = interviews.filter(i => i.jobId === job.id);
          return (
            <div key={job.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-semibold">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{job.company} · Applied {job.appliedDate}</p>
                </div>
              </div>

              {jobInterviews.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Interviews</p>
                  <div className="space-y-2">
                    {jobInterviews.map(interview => (
                      <div key={interview.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{interviewTypeLabel[interview.type]}</span>
                          <span className="text-xs text-muted-foreground">{interview.date} {interview.time && `at ${interview.time}`}</span>
                        </div>
                        <Badge variant={interview.status === "completed" ? "success" : interview.status === "cancelled" ? "destructive" : "warning"}>
                          {interview.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobInterviews.length === 0 && job.status === "interviewing" && (
                <p className="mt-3 text-sm text-muted-foreground italic">No interviews scheduled yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
