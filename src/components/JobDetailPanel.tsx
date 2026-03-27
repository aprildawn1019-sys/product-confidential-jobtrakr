import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, MapPin, Calendar, Clock, User, Mail, Phone, Linkedin, Users, Link2, Unlink, Edit3, Save, X, Plus, CalendarDays, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import CoverLetterDialog from "@/components/CoverLetterDialog";
import FitScoreStars from "@/components/FitScoreStars";
import UrgencyBadge from "@/components/UrgencyBadge";
import type { Job, Contact, Interview } from "@/types/jobTracker";

interface JobDetailPanelProps {
  job: Job;
  linkedContacts: Contact[];
  networkMatches: Contact[];
  allContacts: Contact[];
  interviews: Interview[];
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onLinkContact: (jobId: string, contactId: string) => void;
  onUnlinkContact: (jobId: string, contactId: string) => void;
  onAddInterview: (interview: Omit<Interview, "id">) => void;
  onUpdateInterview: (id: string, updates: Partial<Interview>) => void;
  onDeleteInterview: (id: string) => void;
}

function QuickScheduleInterview({ jobId, onAdd }: { jobId: string; onAdd: (i: Omit<Interview, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Interview["type"]>("phone");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!date) return;
    onAdd({ jobId, type, date: format(date, "yyyy-MM-dd"), time: time || undefined, notes: notes || undefined, status: "scheduled" });
    setOpen(false);
    setType("phone");
    setDate(undefined);
    setTime("");
    setNotes("");
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" />Schedule Interview
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={type} onValueChange={v => setType(v as Interview["type"])}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="behavioral">Behavioral</SelectItem>
            <SelectItem value="onsite">On-site</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-7 text-xs justify-start", !date && "text-muted-foreground")}>
              <CalendarDays className="h-3 w-3 mr-1" />
              {date ? format(date, "MMM d") : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-7 text-xs" />
      </div>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-7 text-xs" />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!date}>Add</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

export default function JobDetailPanel({
  job, linkedContacts, networkMatches, allContacts, interviews, onUpdateJob, onLinkContact, onUnlinkContact, onAddInterview, onUpdateInterview, onDeleteInterview,
}: JobDetailPanelProps) {
  const [editingJob, setEditingJob] = useState(false);
  const [editingPoster, setEditingPoster] = useState(false);
  const [jobForm, setJobForm] = useState({
    company: job.company, title: job.title, location: job.location,
    type: job.type, salary: job.salary || "", url: job.url || "", notes: job.notes || "",
    description: job.description || "",
  });
  const [poster, setPoster] = useState({
    posterName: job.posterName || "", posterEmail: job.posterEmail || "",
    posterPhone: job.posterPhone || "", posterRole: job.posterRole || "",
  });

  const handleSaveJob = () => {
    onUpdateJob(job.id, jobForm);
    setEditingJob(false);
  };

  const handleSavePoster = () => {
    onUpdateJob(job.id, poster);
    setEditingPoster(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const linkedIds = new Set(linkedContacts.map(c => c.id));
  const matchIds = new Set(networkMatches.map(c => c.id));
  const availableToLink = allContacts.filter(c => !linkedIds.has(c.id) && !matchIds.has(c.id));

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border mt-2">
      {/* Job Details - Inline Editing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Job Details</h4>
          <div className="flex items-center gap-1">
            <CoverLetterDialog job={job} />
            {editingJob ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleSaveJob}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingJob(false)}><X className="h-3.5 w-3.5" /></Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditingJob(true)}><Edit3 className="h-3.5 w-3.5 mr-1" />Edit</Button>
            )}
          </div>
        </div>

        {editingJob ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Input value={jobForm.company} onChange={e => setJobForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={jobForm.type} onValueChange={v => setJobForm(f => ({ ...f, type: v as Job["type"] }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Salary</Label>
              <Input value={jobForm.salary} onChange={e => setJobForm(f => ({ ...f, salary: e.target.value }))} className="h-8 text-sm" placeholder="e.g. $150k-$200k" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={jobForm.url} onChange={e => setJobForm(f => ({ ...f, url: e.target.value }))} className="h-8 text-sm" placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={jobForm.notes} onChange={e => setJobForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Job Description</Label>
              <Textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} rows={4} className="text-sm" placeholder="Full job description..." />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Location</span>
                <p className="font-medium">{job.location || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Applied</span>
                <p className="font-medium">{formatDate(job.appliedDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Stage Updated</span>
                <p className="font-medium">{formatDate(job.statusUpdatedAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type / Salary</span>
                <p className="font-medium capitalize">{job.type}{job.salary ? ` · ${job.salary}` : ""}</p>
              </div>
              <div className="col-span-2 md:col-span-4">
                <span className="text-muted-foreground text-sm">Fit & Urgency</span>
                <div className="flex items-center gap-3 mt-1">
                  <FitScoreStars score={job.fitScore} onChange={s => onUpdateJob(job.id, { fitScore: s || undefined })} />
                  <UrgencyBadge urgency={job.urgency} onChange={u => onUpdateJob(job.id, { urgency: u })} />
                </div>
              </div>
            </div>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />View Job Posting
              </a>
            )}
            {job.notes && <p className="text-sm text-muted-foreground">{job.notes}</p>}
            {job.description && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Job Description</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{job.description}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Poster / Recruiter Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Recruiter / Hiring Manager</h4>
          <Button variant="ghost" size="sm" onClick={() => setEditingPoster(!editingPoster)}>
            {editingPoster ? "Cancel" : "Edit"}
          </Button>
        </div>
        {editingPoster ? (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={poster.posterName} onChange={e => setPoster(p => ({ ...p, posterName: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Role" value={poster.posterRole} onChange={e => setPoster(p => ({ ...p, posterRole: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Email" value={poster.posterEmail} onChange={e => setPoster(p => ({ ...p, posterEmail: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Phone" value={poster.posterPhone} onChange={e => setPoster(p => ({ ...p, posterPhone: e.target.value }))} className="h-8 text-sm" />
            <Button size="sm" onClick={handleSavePoster} className="col-span-2">Save</Button>
          </div>
        ) : (
          <div className="text-sm">
            {job.posterName ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{job.posterName}</span>
                {job.posterRole && <span className="text-muted-foreground">{job.posterRole}</span>}
                {job.posterEmail && (
                  <a href={`mailto:${job.posterEmail}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Mail className="h-3 w-3" />{job.posterEmail}
                  </a>
                )}
                {job.posterPhone && (
                  <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{job.posterPhone}</span>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No recruiter info added yet</p>
            )}
          </div>
        )}
      </div>

      {/* Interviews */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Interviews</h4>
        </div>

        {interviews.length > 0 ? (
          <div className="space-y-1.5">
            {interviews.map(iv => (
              <div key={iv.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{iv.type}</Badge>
                  <span className="text-muted-foreground">{iv.date}{iv.time ? ` at ${iv.time}` : ""}</span>
                  <Badge variant={iv.status === "scheduled" ? "default" : iv.status === "completed" ? "secondary" : "destructive"} className="text-xs capitalize">{iv.status}</Badge>
                </div>
                <div className="flex items-center gap-0.5">
                  {iv.status === "scheduled" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateInterview(iv.id, { status: "completed" })} title="Complete">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateInterview(iv.id, { status: "cancelled" })} title="Cancel">
                        <XCircle className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteInterview(iv.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No interviews scheduled</p>
        )}

        <QuickScheduleInterview jobId={job.id} onAdd={onAddInterview} />
      </div>

      {/* Network Connections */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Network Connections</h4>

        {linkedContacts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Linked Contacts</p>
            {linkedContacts.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">· {c.role} at {c.company}</span>
                  {c.linkedin && (
                    <a href={`https://${c.linkedin}`} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUnlinkContact(job.id, c.id)}>
                  <Unlink className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {networkMatches.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Contacts at {job.company}</p>
            {networkMatches.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">· {c.role}</span>
                  <Badge variant="secondary" className="text-xs">Same Org</Badge>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onLinkContact(job.id, c.id)}>
                  <Link2 className="h-3 w-3 mr-1" />Link
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableToLink.length > 0 && (
          <Select onValueChange={v => onLinkContact(job.id, v)}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Link a contact..." />
            </SelectTrigger>
            <SelectContent>
              {availableToLink.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {linkedContacts.length === 0 && networkMatches.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No network connections found for this position</p>
        )}
      </div>
    </div>
  );
}
