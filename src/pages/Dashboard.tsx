import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Users, CalendarCheck, Clock, Send, AlertTriangle, Star, CalendarDays, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import FitScoreStars from "@/components/FitScoreStars";
import type { Job, Contact, Interview } from "@/types/jobTracker";

interface DashboardProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
}

const urgencyColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard({ jobs, contacts, interviews }: DashboardProps) {
  const activeApps = jobs.filter(j => !["saved", "rejected", "withdrawn", "closed"].includes(j.status)).length;
  const upcoming = interviews.filter(i => i.status === "scheduled");

  const highUrgencyJobs = useMemo(() =>
    jobs.filter(j => j.urgency === "critical" || j.urgency === "high")
      .sort((a, b) => (a.urgency === "critical" ? 0 : 1) - (b.urgency === "critical" ? 0 : 1))
      .slice(0, 5),
  [jobs]);

  const topFitJobs = useMemo(() =>
    jobs.filter(j => j.fitScore && j.fitScore >= 4)
      .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
      .slice(0, 5),
  [jobs]);

  const followUpContacts = useMemo(() =>
    contacts.filter(c => c.followUpDate)
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
      .slice(0, 6),
  [contacts]);

  const overdueCount = followUpContacts.filter(c => isPast(new Date(c.followUpDate!)) && !isToday(new Date(c.followUpDate!))).length;

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
        {/* High Urgency Jobs */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />High Urgency Jobs
          </h2>
          {highUrgencyJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No high-urgency jobs</p>
          ) : (
            <div className="space-y-3">
              {highUrgencyJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                  <Link to="/jobs" className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Badge variant="outline" className={`text-xs capitalize ${urgencyColors[job.urgency || ""]}`}>
                      {job.urgency}
                    </Badge>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Rated Fits */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />Top Rated Fits
          </h2>
          {topFitJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No jobs rated 4+ stars yet</p>
          ) : (
            <div className="space-y-3">
              {topFitJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                  <Link to="/jobs" className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <FitScoreStars score={job.fitScore} size="sm" />
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up Reminders */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-info" />Follow-up Reminders
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">{overdueCount} overdue</Badge>
            )}
          </h2>
          {followUpContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No follow-ups scheduled</p>
          ) : (
            <div className="space-y-3">
              {followUpContacts.map(contact => {
                const d = new Date(contact.followUpDate!);
                const overdue = isPast(d) && !isToday(d);
                const today = isToday(d);
                return (
                  <div key={contact.id} className={`flex items-center justify-between rounded-lg border p-3 ${overdue ? "border-destructive/40 bg-destructive/5" : today ? "border-warning/40 bg-warning/5" : "border-border"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role} at {contact.company}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${overdue ? "text-destructive border-destructive/30" : today ? "text-warning border-warning/30" : "text-info border-info/30"}`}>
                      {overdue ? `Overdue ${formatDistanceToNow(d)}` : today ? "Today" : `In ${formatDistanceToNow(d)}`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
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
            {(["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn", "closed"] as const).map(status => {
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
