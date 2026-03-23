import { Briefcase, Users, CalendarCheck, Trophy, Clock, Send } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import type { Job, Contact, Interview } from "@/types/jobTracker";

interface DashboardProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
}

export default function Dashboard({ jobs, contacts, interviews }: DashboardProps) {
  const activeApps = jobs.filter(j => !["saved", "rejected", "withdrawn"].includes(j.status)).length;
  const upcoming = interviews.filter(i => i.status === "scheduled");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Your job search at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={jobs.length} icon={Briefcase} />
        <StatCard label="Active Applications" value={activeApps} icon={Send} accent="info" />
        <StatCard label="Interviews Scheduled" value={upcoming.length} icon={CalendarCheck} accent="warning" />
        <StatCard label="Connections" value={contacts.length} icon={Users} accent="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Recent Jobs</h2>
          <div className="space-y-3">
            {jobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-sm">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Upcoming Interviews</h2>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">No upcoming interviews</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(interview => {
                const job = jobs.find(j => j.id === interview.jobId);
                return (
                  <div key={interview.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium text-sm">{job?.company} — {interview.type}</p>
                      <p className="text-xs text-muted-foreground">{interview.date} {interview.time && `at ${interview.time}`}</p>
                    </div>
                    <Badge variant="warning">{interview.type}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-4">Application Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn"] as const).map(status => {
              const count = jobs.filter(j => j.status === status).length;
              return (
                <div key={status} className="text-center rounded-lg border border-border p-3">
                  <p className="font-display text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{status}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Need to import Badge
import { Badge } from "@/components/ui/badge";
