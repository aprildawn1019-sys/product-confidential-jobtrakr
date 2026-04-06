import { useMemo } from "react";
import PipelineFunnel from "@/components/PipelineFunnel";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Users, CalendarCheck, Clock, Send, AlertTriangle, Star, CalendarDays, ExternalLink, X, Pencil, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatDistanceToNow, isPast, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import StatusSelect from "@/components/StatusSelect";
import FitScoreStars from "@/components/FitScoreStars";
import CompanyAvatar from "@/components/CompanyAvatar";
import type { Job, Contact, Interview, JobContact, TargetCompany } from "@/types/jobTracker";

interface DashboardProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  jobContacts: JobContact[];
  targetCompanies?: TargetCompany[];
  onUpdateStatus?: (id: string, status: string) => void;
  onUpdateJob?: (id: string, updates: Partial<Job>) => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void;
}

const urgencyColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

const allStatuses = ["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn", "closed"];
const allUrgencies = ["low", "medium", "high", "critical"];

export default function Dashboard({ jobs, contacts, interviews, jobContacts, targetCompanies = [], onUpdateStatus, onUpdateJob, onUpdateContact }: DashboardProps) {
  const navigate = useNavigate();
  const activeApps = jobs.filter(j => !["saved", "rejected", "withdrawn", "closed"].includes(j.status)).length;
  const upcoming = interviews.filter(i => i.status === "scheduled");

  const inactiveStatuses = ["rejected", "closed"];

  const highUrgencyJobs = useMemo(() =>
    jobs.filter(j => (j.urgency === "critical" || j.urgency === "high") && !inactiveStatuses.includes(j.status))
      .sort((a, b) => (a.urgency === "critical" ? 0 : 1) - (b.urgency === "critical" ? 0 : 1))
      .slice(0, 5),
  [jobs]);

  const topFitJobs = useMemo(() =>
    jobs.filter(j => j.fitScore && j.fitScore >= 4 && !inactiveStatuses.includes(j.status))
      .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
      .slice(0, 5),
  [jobs]);

  const followUpContacts = useMemo(() =>
    contacts.filter(c => {
      if (!c.followUpDate) return false;
      const linkedJobIds = jobContacts.filter(jc => jc.contactId === c.id).map(jc => jc.jobId);
      // If the contact has linked jobs, exclude if ALL are inactive
      if (linkedJobIds.length > 0) {
        const allInactive = linkedJobIds.every(jid => {
          const job = jobs.find(j => j.id === jid);
          return job && inactiveStatuses.includes(job.status);
        });
        if (allInactive) return false;
      }
      return true;
    })
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
      .slice(0, 6),
  [contacts, jobContacts, jobs]);

  const overdueCount = followUpContacts.filter(c => isPast(new Date(c.followUpDate!)) && !isToday(new Date(c.followUpDate!))).length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Your job search at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={jobs.length} icon={Briefcase} href="/jobs" />
        <StatCard label="Active Applications" value={activeApps} icon={Send} accent="info" href="/jobs?status=active" />
        <StatCard label="Interviews Scheduled" value={upcoming.length} icon={CalendarCheck} accent="warning" href="/interviews" />
        <StatCard label="Target Companies" value={targetCompanies.filter(tc => tc.status !== "archived").length} icon={Star} accent="success" href="/target-companies" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Pipeline Overview</h2>
        <PipelineFunnel jobs={jobs} onClickStage={(status) => navigate(`/jobs?status=${status}`)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* High Urgency Jobs */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />High Urgency Jobs
          </h2>
          {highUrgencyJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 mb-3">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground">No high-urgency jobs right now</p>
              <p className="text-xs text-muted-foreground mt-1">Set urgency on jobs to track what needs attention first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highUrgencyJobs.map(job => (
                <div key={job.id} className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors space-y-2">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar company={job.company} />
                    <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                    </Link>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0 ml-2">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusSelect value={job.status} onValueChange={v => onUpdateStatus?.(job.id, v)} />
                    <Select value={job.urgency || ""} onValueChange={v => onUpdateJob?.(job.id, { urgency: v })}>
                      <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue placeholder="Urgency" /></SelectTrigger>
                      <SelectContent>
                        {allUrgencies.map(u => <SelectItem key={u} value={u} className="text-xs capitalize">{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FitScoreStars score={job.fitScore} size="sm" onChange={s => onUpdateJob?.(job.id, { fitScore: s || undefined })} />
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No jobs rated 4+ stars yet</p>
              <p className="text-xs text-muted-foreground mt-1">Rate your job fit to surface the best opportunities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topFitJobs.map(job => (
                <div key={job.id} className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors space-y-2">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar company={job.company} />
                    <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                    </Link>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0 ml-2">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusSelect value={job.status} onValueChange={v => onUpdateStatus?.(job.id, v)} />
                    <FitScoreStars score={job.fitScore} size="sm" onChange={s => onUpdateJob?.(job.id, { fitScore: s || undefined })} />
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
            <Link to="/interviews?filter=followups" className="ml-auto text-xs font-normal text-muted-foreground hover:text-primary transition-colors">View all →</Link>
          </h2>
          {followUpContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 mb-3">
                <CalendarDays className="h-6 w-6 text-info" />
              </div>
              <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
              <Link to="/contacts" className="text-xs text-primary hover:underline mt-1">Set a follow-up on a contact →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpContacts.map(contact => {
                const d = new Date(contact.followUpDate!);
                const overdue = isPast(d) && !isToday(d);
                const today = isToday(d);
                return (
                  <div key={contact.id} className={cn("flex items-center justify-between rounded-lg border p-3 group", overdue ? "border-destructive/40 bg-destructive/5" : today ? "border-warning/40 bg-warning/5" : "border-border")}>
                    <button
                      onClick={() => navigate(`/contacts?highlight=${contact.id}`)}
                      className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                    >
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role} at {contact.company}</p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-xs", overdue ? "text-destructive border-destructive/30" : today ? "text-warning border-warning/30" : "text-info border-info/30")}>
                        {overdue ? `Overdue ${formatDistanceToNow(d)}` : today ? "Today" : `In ${formatDistanceToNow(d)}`}
                      </Badge>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={d}
                            onSelect={newDate => {
                              if (newDate && onUpdateContact) {
                                onUpdateContact(contact.id, { followUpDate: format(newDate, "yyyy-MM-dd") });
                              }
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => onUpdateContact?.(contact.id, { followUpDate: undefined })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Interviews */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center justify-between">
            <span>Upcoming Interviews</span>
            <Link to="/interviews" className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors">View calendar →</Link>
          </h2>
          {upcoming.length === 0 ? (
            <Link to="/interviews" className="flex flex-col items-center justify-center py-8 text-center group">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 mb-3 group-hover:bg-warning/20 transition-colors">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">No upcoming interviews</p>
              <p className="text-xs text-primary mt-1">Schedule one →</p>
            </Link>
          ) : (
            <div className="space-y-3">
              {upcoming.map(interview => {
                const job = jobs.find(j => j.id === interview.jobId);
                return (
                  <Link to="/interviews" key={interview.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{job?.company} — {interview.type}</p>
                      <p className="text-xs text-muted-foreground">{interview.date} {interview.time && `at ${interview.time}`}</p>
                    </div>
                    <Badge variant="warning">{interview.type}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-5">Application Pipeline</h2>
          {(() => {
            const stages = [
              { key: "saved", label: "Saved", color: "bg-[hsl(220,9%,46%)]" },
              { key: "applied", label: "Applied", color: "bg-[hsl(142,60%,45%)]" },
              { key: "screening", label: "Screening", color: "bg-[hsl(190,70%,48%)]" },
              { key: "interviewing", label: "Interviewing", color: "bg-[hsl(210,80%,52%)]" },
              { key: "offer", label: "Offer", color: "bg-[hsl(36,90%,55%)]" },
              { key: "rejected", label: "Rejected", color: "bg-[hsl(15,75%,55%)]" },
              { key: "withdrawn", label: "Withdrawn", color: "bg-[hsl(220,9%,62%)]" },
              { key: "closed", label: "Closed", color: "bg-[hsl(220,9%,72%)]" },
            ];
            const counts = stages.map(s => ({ ...s, count: jobs.filter(j => j.status === s.key).length }));
            const activeStages = counts.filter(s => s.count > 0);
            const total = Math.max(jobs.length, 1);
            return (
              <div className="space-y-3">
                {/* Progress bar with soft rounded overlapping segments */}
                <div className="relative h-9 w-full">
                  {(() => {
                    let leftPercent = 0;
                    return activeStages.map((s, i) => {
                      const widthPercent = (s.count / total) * 100;
                      const el = (
                        <Link
                          key={s.key}
                          to={`/jobs?status=${s.key}`}
                          className={cn(
                            "absolute top-0 h-full rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md cursor-pointer",
                            s.color
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 3)}%`,
                            minWidth: "36px",
                            zIndex: activeStages.length - i,
                          }}
                          title={`${s.label}: ${s.count} — Click to view`}
                        >
                          {s.count}
                        </Link>
                      );
                      leftPercent += widthPercent;
                      return el;
                    });
                  })()}
                  {activeStages.length === 0 && (
                    <div className="absolute inset-0 rounded-full bg-muted" />
                  )}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                  {counts.map(s => (
                    <Link key={s.key} to={`/jobs?status=${s.key}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      <div className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className="text-xs font-semibold">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
