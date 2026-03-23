import { useState } from "react";
import { MapPin, ExternalLink, Trash2, LayoutList, Kanban, ChevronDown, ChevronUp, Calendar, Clock, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import AddJobDialog from "@/components/AddJobDialog";
import JobKanban from "@/components/JobKanban";
import JobDetailPanel from "@/components/JobDetailPanel";
import type { Job, Contact, JobStatus } from "@/types/jobTracker";

interface JobsProps {
  jobs: Job[];
  contacts: Contact[];
  onAdd: (job: Omit<Job, "id" | "createdAt">) => void;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDelete: (id: string) => void;
  onLinkContact: (jobId: string, contactId: string) => void;
  onUnlinkContact: (jobId: string, contactId: string) => void;
  getContactsForJob: (jobId: string) => Contact[];
  getNetworkMatchesForJob: (job: Job) => Contact[];
}

export default function Jobs({
  jobs, contacts, onAdd, onUpdateStatus, onUpdateJob, onDelete,
  onLinkContact, onUnlinkContact, getContactsForJob, getNetworkMatchesForJob,
}: JobsProps) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const toggleExpand = (id: string) => setExpandedJob(prev => prev === id ? null : id);

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="mt-1 text-muted-foreground">{jobs.length} positions tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("list")}>
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("kanban")}>
              <Kanban className="h-4 w-4" />
            </Button>
          </div>
          <AddJobDialog onAdd={onAdd} />
        </div>
      </div>

      {view === "kanban" ? (
        <JobKanban
          jobs={jobs}
          contacts={contacts}
          onUpdateStatus={onUpdateStatus}
          onUpdateJob={onUpdateJob}
          onDelete={onDelete}
          onLinkContact={onLinkContact}
          onUnlinkContact={onUnlinkContact}
          getContactsForJob={getContactsForJob}
          getNetworkMatchesForJob={getNetworkMatchesForJob}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const isExpanded = expandedJob === job.id;
            const linkedContacts = getContactsForJob(job.id);
            const networkMatches = getNetworkMatchesForJob(job);
            const hasNetwork = linkedContacts.length > 0 || networkMatches.length > 0;

            return (
              <div key={job.id} className="rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                        <StatusBadge status={job.status} />
                        {hasNetwork && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" />{linkedContacts.length + networkMatches.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1">{job.company}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                        <span className="capitalize">{job.type}</span>
                        {job.salary && <span>{job.salary}</span>}
                        {job.appliedDate && (
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Applied {formatDate(job.appliedDate)}</span>
                        )}
                        {job.statusUpdatedAt && (
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Updated {formatDate(job.statusUpdatedAt)}</span>
                        )}
                        {job.posterName && (
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{job.posterName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={job.status} onValueChange={v => onUpdateStatus(job.id, v as JobStatus)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn"] as const).map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {job.url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(job.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(job.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5">
                    <JobDetailPanel
                      job={job}
                      linkedContacts={linkedContacts}
                      networkMatches={networkMatches}
                      allContacts={contacts}
                      onUpdateJob={onUpdateJob}
                      onLinkContact={onLinkContact}
                      onUnlinkContact={onUnlinkContact}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
