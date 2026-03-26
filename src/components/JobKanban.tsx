import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ExternalLink, Trash2, GripVertical, Calendar, Clock, User, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import JobDetailPanel from "@/components/JobDetailPanel";
import FitScoreStars from "@/components/FitScoreStars";
import UrgencyBadge from "@/components/UrgencyBadge";
import type { Job, Contact, JobStatus, Interview } from "@/types/jobTracker";

const columns: { status: JobStatus; label: string }[] = [
  { status: "saved", label: "Saved" },
  { status: "applied", label: "Applied" },
  { status: "screening", label: "Screening" },
  { status: "interviewing", label: "Interviewing" },
  { status: "offer", label: "Offer" },
  { status: "rejected", label: "Rejected" },
  { status: "withdrawn", label: "Withdrawn" },
];

interface JobKanbanProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDelete: (id: string) => void;
  onLinkContact: (jobId: string, contactId: string) => void;
  onUnlinkContact: (jobId: string, contactId: string) => void;
  getContactsForJob: (jobId: string) => Contact[];
  getNetworkMatchesForJob: (job: Job) => Contact[];
  onAddInterview: (interview: Omit<Interview, "id">) => void;
  onUpdateInterview: (id: string, updates: Partial<Interview>) => void;
  onDeleteInterview: (id: string) => void;
}

export default function JobKanban({
  jobs, contacts, interviews, onUpdateStatus, onUpdateJob, onDelete,
  onLinkContact, onUnlinkContact, getContactsForJob, getNetworkMatchesForJob,
  onAddInterview, onUpdateInterview, onDeleteInterview,
}: JobKanbanProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("text/plain", jobId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain");
    if (jobId) onUpdateStatus(jobId, status);
  };

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {columns.map(col => {
        const colJobs = jobs.filter(j => j.status === col.status);
        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-72 flex flex-col rounded-xl border border-border bg-muted/30"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <StatusBadge status={col.status} />
                <span className="text-xs text-muted-foreground font-medium">{colJobs.length}</span>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {colJobs.map(job => {
                const isExpanded = expandedJob === job.id;
                const linkedContacts = getContactsForJob(job.id);
                const networkMatches = getNetworkMatchesForJob(job);
                const hasNetwork = linkedContacts.length > 0 || networkMatches.length > 0;

                return (
                  <div
                    key={job.id}
                    draggable={!isExpanded}
                    onDragStart={e => handleDragStart(e, job.id)}
                    className="rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-semibold text-sm truncate flex-1">{job.title}</h4>
                          {hasNetwork && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                              <Users className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{job.location}</span>
                        </div>
                        {job.salary && <p className="text-xs text-muted-foreground mt-1">{job.salary}</p>}

                        {/* Dates row */}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          {job.appliedDate && (
                            <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{formatDate(job.appliedDate)}</span>
                          )}
                          {job.statusUpdatedAt && (
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatDate(job.statusUpdatedAt)}</span>
                          )}
                        </div>

                        {job.posterName && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" />{job.posterName}
                          </p>
                        )}

                        {/* Fit & Urgency */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <FitScoreStars score={job.fitScore} onChange={s => onUpdateJob(job.id, { fitScore: s || undefined })} size="sm" />
                          {job.urgency && <UrgencyBadge urgency={job.urgency} onChange={u => onUpdateJob(job.id, { urgency: u })} mode="badge" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[10px] text-muted-foreground"
                        onClick={e => { e.stopPropagation(); setExpandedJob(isExpanded ? null : job.id); }}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Details
                      </Button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.url && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(job.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <JobDetailPanel
                        job={job}
                        linkedContacts={linkedContacts}
                        networkMatches={networkMatches}
                        allContacts={contacts}
                        interviews={interviews.filter(i => i.jobId === job.id)}
                        onUpdateJob={onUpdateJob}
                        onLinkContact={onLinkContact}
                        onUnlinkContact={onUnlinkContact}
                        onAddInterview={onAddInterview}
                        onUpdateInterview={onUpdateInterview}
                        onDeleteInterview={onDeleteInterview}
                      />
                    )}
                  </div>
                );
              })}
              {colJobs.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
