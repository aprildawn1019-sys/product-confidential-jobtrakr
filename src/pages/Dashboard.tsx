import { useMemo, useState } from "react";
import PipelineFunnel from "@/components/PipelineFunnel";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, CalendarCheck, Clock, Send, Star, CalendarDays, ExternalLink, X, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatDistanceToNow, isPast, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
// StatusBadge removed - unused
import StatusSelect from "@/components/StatusSelect";
import MatchScoreStars from "@/components/MatchScoreStars";
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

const interviewTypeColors: Record<string, string> = {
  phone: "bg-blue-500/10 text-blue-700 border-blue-200",
  technical: "bg-purple-500/10 text-purple-700 border-purple-200",
  behavioral: "bg-amber-500/10 text-amber-700 border-amber-200",
  onsite: "bg-green-500/10 text-green-700 border-green-200",
  final: "bg-red-500/10 text-red-700 border-red-200",
};

const allPriorities = ["low", "medium", "high"];

export default function Dashboard({ jobs, contacts, interviews, jobContacts, targetCompanies = [], onUpdateStatus, onUpdateJob, onUpdateContact }: DashboardProps) {
  const navigate = useNavigate();
  const activeApps = jobs.filter(j => !["saved", "rejected", "withdrawn", "closed"].includes(j.status)).length;
  const upcoming = interviews.filter(i => i.status === "scheduled");

  const inactiveStatuses = ["rejected", "closed"];

  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [matchScoreFilter, setMatchScoreFilter] = useState<string>("all");

  const activeOpportunities = useMemo(() => {
    let filtered = jobs.filter(j => !inactiveStatuses.includes(j.status));
    if (priorityFilter !== "all") {
      filtered = filtered.filter(j => j.priority === priorityFilter);
    }
    if (matchScoreFilter !== "all") {
      const minScore = parseInt(matchScoreFilter);
      filtered = filtered.filter(j => j.fitScore && j.fitScore >= minScore);
    }
    return filtered
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const aPri = priorityOrder[a.priority || ""] ?? 3;
        const bPri = priorityOrder[b.priority || ""] ?? 3;
        if (aPri !== bPri) return aPri - bPri;
        return (b.fitScore || 0) - (a.fitScore || 0);
      })
      .slice(0, 10);
  }, [jobs, priorityFilter, matchScoreFilter]);

  const followUpContacts = useMemo(() =>
    contacts.filter(c => {
      if (!c.followUpDate) return false;
      const linkedJobIds = jobContacts.filter(jc => jc.contactId === c.id).map(jc => jc.jobId);
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
                      <p className="font-medium text-sm">{job?.title} at {job?.company}</p>
                      <p className="text-xs text-muted-foreground">{interview.date} {interview.time && `at ${interview.time}`}</p>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", interviewTypeColors[interview.type] || "bg-muted text-muted-foreground")}>{interview.type}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Opportunities */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />Active Opportunities
            </h2>
            <div className="flex items-center gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                  {allPriorities.map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={matchScoreFilter} onValueChange={setMatchScoreFilter}>
                <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue placeholder="Match Score" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Scores</SelectItem>
                  <SelectItem value="4" className="text-xs">4+ Stars</SelectItem>
                  <SelectItem value="3" className="text-xs">3+ Stars</SelectItem>
                  <SelectItem value="2" className="text-xs">2+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeOpportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No active opportunities match your filters</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust filters or add jobs to get started</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
              {activeOpportunities.map(job => (
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
                    <Select value={job.priority || ""} onValueChange={v => onUpdateJob?.(job.id, { priority: v })}>
                      <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        {allPriorities.map(p => <SelectItem key={p} value={p} className="text-xs">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Match:</span>
                      <MatchScoreStars score={job.fitScore} size="sm" onChange={s => onUpdateJob?.(job.id, { fitScore: s || undefined })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
