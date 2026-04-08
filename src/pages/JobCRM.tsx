import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft, ExternalLink, MapPin, Calendar, Clock, User, Users, Plus,
  MessageSquare, Send, Handshake, UserPlus, Phone, FileText, MoreHorizontal,
  Trash2, ChevronDown, ChevronUp, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import StatusSelect from "@/components/StatusSelect";
import MatchScoreStars from "@/components/MatchScoreStars";
import PriorityBadge from "@/components/PriorityBadge";
import WarmthBadge from "@/components/WarmthBadge";
import CoverLetterDialog from "@/components/CoverLetterDialog";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Job, Contact, Interview, JobActivity, JobStatus, TargetCompany } from "@/types/jobTracker";

const ACTIVITY_TYPES = [
  { value: "shared_resume", label: "Shared Resume", icon: FileText },
  { value: "cold_outreach", label: "Cold Outreach", icon: Send },
  { value: "introduction", label: "Introduction", icon: Handshake },
  { value: "referral_request", label: "Referral Request", icon: UserPlus },
  { value: "informational_chat", label: "Informational Chat", icon: MessageSquare },
  { value: "follow_up", label: "Follow Up", icon: Phone },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

function activityLabel(type: string) {
  return ACTIVITY_TYPES.find(a => a.value === type)?.label || type;
}

function ActivityIcon({ type }: { type: string }) {
  const config = ACTIVITY_TYPES.find(a => a.value === type);
  const Icon = config?.icon || MoreHorizontal;
  return <Icon className="h-4 w-4" />;
}

interface TimelineEntry {
  id: string;
  date: string;
  type: "interview" | "job_activity" | "contact_activity" | "status_change";
  label: string;
  detail?: string;
  contactName?: string;
  icon: React.ReactNode;
}

interface JobCRMProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onLinkContact: (jobId: string, contactId: string) => void;
  onUnlinkContact: (jobId: string, contactId: string) => void;
  getContactsForJob: (jobId: string) => Contact[];
  getNetworkMatchesForJob: (job: Job) => Contact[];
  onAddInterview: (interview: Omit<Interview, "id">) => void;
  onUpdateInterview: (id: string, updates: Partial<Interview>) => void;
  onDeleteInterview: (id: string) => void;
  getActivitiesForContact: (contactId: string) => { id: string; contactId: string; activityType: string; activityDate: string; notes?: string; createdAt: string }[];
  getJobActivitiesForJob: (jobId: string) => JobActivity[];
  onAddJobActivity: (activity: Omit<JobActivity, "id" | "createdAt">) => void;
  onDeleteJobActivity: (id: string) => void;
  targetCompanies?: TargetCompany[];
}

export default function JobCRM({
  jobs, contacts, interviews,
  onUpdateStatus, onUpdateJob,
  onLinkContact, onUnlinkContact,
  getContactsForJob, getNetworkMatchesForJob,
  onAddInterview, onUpdateInterview, onDeleteInterview,
  getActivitiesForContact, getJobActivitiesForJob,
  onAddJobActivity, onDeleteJobActivity, targetCompanies = [],
}: JobCRMProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = jobs.find(j => j.id === id);

  const [showLogForm, setShowLogForm] = useState(false);
  const [newActType, setNewActType] = useState("other");
  const [newActDate, setNewActDate] = useState(new Date().toISOString().split("T")[0]);
  const [newActContactId, setNewActContactId] = useState("");
  const [newActNotes, setNewActNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [descOpen, setDescOpen] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState(false);
  const [recruiterForm, setRecruiterForm] = useState({ name: "", email: "", phone: "", role: "" });

  // Interview scheduling
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedType, setSchedType] = useState("phone");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

  const linkedContacts = job ? getContactsForJob(job.id) : [];
  const networkMatches = job ? getNetworkMatchesForJob(job) : [];
  const jobInterviews = job ? interviews.filter(i => i.jobId === job.id) : [];
  const jobActivities = job ? getJobActivitiesForJob(job.id) : [];

  // Build unified timeline
  const timeline: TimelineEntry[] = useMemo(() => {
    if (!job) return [];
    const entries: TimelineEntry[] = [];

    jobActivities.forEach(ja => {
      const contact = ja.contactId ? contacts.find(c => c.id === ja.contactId) : undefined;
      entries.push({
        id: `ja-${ja.id}`, date: ja.activityDate, type: "job_activity",
        label: activityLabel(ja.activityType), detail: ja.notes,
        contactName: contact?.name, icon: <ActivityIcon type={ja.activityType} />,
      });
    });

    jobInterviews.forEach(iv => {
      entries.push({
        id: `iv-${iv.id}`, date: iv.date, type: "interview",
        label: `${iv.type.charAt(0).toUpperCase() + iv.type.slice(1)} Interview`,
        detail: iv.notes, icon: <Calendar className="h-4 w-4" />,
      });
    });

    linkedContacts.forEach(contact => {
      const activities = getActivitiesForContact(contact.id);
      activities.forEach(ca => {
        entries.push({
          id: `ca-${ca.id}`, date: ca.activityDate, type: "contact_activity",
          label: ca.activityType, detail: ca.notes, contactName: contact.name,
          icon: <User className="h-4 w-4" />,
        });
      });
    });

    if (job.statusUpdatedAt) {
      entries.push({
        id: "status", date: job.statusUpdatedAt.split("T")[0], type: "status_change",
        label: `Status → ${job.status}`, icon: <Briefcase className="h-4 w-4" />,
      });
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [job, jobActivities, jobInterviews, linkedContacts, contacts, getActivitiesForContact]);

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="link" onClick={() => navigate("/jobs")}>Back to Jobs</Button>
      </div>
    );
  }

  const handleLogActivity = () => {
    if (!id) return;
    onAddJobActivity({
      jobId: id,
      activityType: newActType,
      activityDate: newActDate,
      contactId: newActContactId || undefined,
      notes: newActNotes || undefined,
    });
    setShowLogForm(false);
    setNewActType("other");
    setNewActDate(new Date().toISOString().split("T")[0]);
    setNewActContactId("");
    setNewActNotes("");
  };

  const handleSaveNotes = () => {
    if (!id) return;
    onUpdateJob(id, { notes: notesValue });
    setEditingNotes(false);
  };

  const handleScheduleInterview = () => {
    if (!id || !schedDate) return;
    onAddInterview({
      jobId: id, type: schedType as Interview["type"],
      date: schedDate, time: schedTime || undefined,
      notes: schedNotes || undefined, status: "scheduled",
    });
    setShowSchedule(false);
    setSchedType("phone");
    setSchedDate("");
    setSchedTime("");
    setSchedNotes("");
  };

  const handleSaveRecruiter = () => {
    if (!id) return;
    onUpdateJob(id, {
      posterName: recruiterForm.name || undefined,
      posterEmail: recruiterForm.email || undefined,
      posterPhone: recruiterForm.phone || undefined,
      posterRole: recruiterForm.role || undefined,
    });
    setEditingRecruiter(false);
  };

  const fmtDate = (d?: string) => {
    if (!d) return "";
    try { return format(new Date(d), "MMM d, yyyy"); } catch { return d; }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back nav */}
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/jobs")}>
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </Button>

      {/* ===== HEADER ===== */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-tight">{job.title}</h1>
              <StatusSelect value={job.status} onValueChange={v => onUpdateStatus(job.id, v as JobStatus)} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg text-muted-foreground">{job.company}</p>
              <TargetCompanyBadge target={targetCompanies.find(tc => companiesMatch(tc.name, job.company))} size="md" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || "—"}</span>
              <span className="capitalize">{job.type}</span>
              {job.salary && <span>{job.salary}</span>}
              {job.appliedDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Applied {fmtDate(job.appliedDate)}</span>}
              {job.statusUpdatedAt && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Updated {fmtDate(job.statusUpdatedAt)}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <FitScoreStars score={job.fitScore} onChange={s => onUpdateJob(job.id, { fitScore: s || undefined })} size="sm" />
              <PriorityBadge priority={job.priority} onChange={p => onUpdateJob(job.id, { priority: p })} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {job.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> View Posting
                </a>
              </Button>
            )}
            <CoverLetterDialog job={job} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT: TIMELINE + ACTIVITY FEED ===== */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowLogForm(!showLogForm)}>
                <Plus className="h-3.5 w-3.5" /> Log Activity
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showLogForm && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={newActType} onValueChange={setNewActType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={newActDate} onChange={e => setNewActDate(e.target.value)} />
                  </div>
                  <Select value={newActContactId} onValueChange={setNewActContactId}>
                    <SelectTrigger><SelectValue placeholder="Contact (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No contact</SelectItem>
                      {[...linkedContacts, ...networkMatches].map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Notes (optional)" value={newActNotes} onChange={e => setNewActNotes(e.target.value)} className="min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleLogActivity}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowLogForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {timeline.length === 0 && !showLogForm && (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet. Log your first action above.</p>
              )}

              <div className="space-y-0">
                {timeline.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-1.5 border ${
                        entry.type === "interview" ? "border-info/30 bg-info/10 text-info" :
                        entry.type === "job_activity" ? "border-accent/30 bg-accent/10 text-accent-foreground" :
                        entry.type === "status_change" ? "border-primary/30 bg-primary/10 text-primary" :
                        "border-border bg-muted text-muted-foreground"
                      }`}>
                        {entry.icon}
                      </div>
                      {idx < timeline.length - 1 && <div className="w-px flex-1 bg-border min-h-[24px]" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.label}</span>
                        {entry.contactName && (
                          <Badge variant="outline" className="text-xs">{entry.contactName}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{fmtDate(entry.date)}</span>
                        {entry.type === "job_activity" && (
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              const realId = entry.id.replace("ja-", "");
                              onDeleteJobActivity(realId);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      {entry.detail && <p className="text-sm text-muted-foreground mt-0.5">{entry.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ===== NOTES & DESCRIPTION ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} className="min-h-[100px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[40px]"
                  onClick={() => { setNotesValue(job.notes || ""); setEditingNotes(true); }}
                >
                  {job.notes || "Click to add notes…"}
                </div>
              )}
            </CardContent>
          </Card>

          {job.description && (
            <Collapsible open={descOpen} onOpenChange={setDescOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Job Description</CardTitle>
                    {descOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>

        {/* ===== RIGHT SIDEBAR ===== */}
        <div className="space-y-6">
          {/* Network & Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Network ({linkedContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedContacts.length === 0 && networkMatches.length === 0 && (
                <p className="text-sm text-muted-foreground">No contacts linked to this job.</p>
              )}
              {linkedContacts.map(contact => (
                <div key={contact.id} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{contact.name}</span>
                      <WarmthBadge warmth={contact.relationshipWarmth} onChange={() => {}} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUnlinkContact(job.id, contact.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{contact.role} at {contact.company}</p>
                  {contact.conversationLog && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">"{contact.conversationLog}"</p>
                  )}
                  {contact.followUpDate && (
                    <p className="text-xs text-info flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Follow up: {fmtDate(contact.followUpDate)}
                    </p>
                  )}
                </div>
              ))}

              {networkMatches.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network Matches</p>
                  {networkMatches.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between rounded-lg border border-dashed border-border p-2.5">
                      <div>
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.role}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onLinkContact(job.id, contact.id)}>
                        Link
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Interviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Interviews ({jobInterviews.length})
              </CardTitle>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowSchedule(!showSchedule)}>
                <Plus className="h-3 w-3" /> Schedule
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showSchedule && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <Select value={schedType} onValueChange={setSchedType}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["phone", "technical", "behavioral", "onsite", "final"].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="h-8" />
                    <Input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className="h-8" />
                  </div>
                  <Input placeholder="Notes" value={schedNotes} onChange={e => setSchedNotes(e.target.value)} className="h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7" onClick={handleScheduleInterview} disabled={!schedDate}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowSchedule(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {jobInterviews.length === 0 && !showSchedule && (
                <p className="text-sm text-muted-foreground">No interviews scheduled.</p>
              )}
              {jobInterviews.map(iv => (
                <div key={iv.id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize text-xs">{iv.type}</Badge>
                    <div className="flex items-center gap-1">
                      {iv.status === "scheduled" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateInterview(iv.id, { status: "completed" })}>
                          <span className="text-xs">✓</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteInterview(iv.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{fmtDate(iv.date)} {iv.time && `at ${iv.time}`}</p>
                  <Badge variant={iv.status === "completed" ? "default" : iv.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                    {iv.status}
                  </Badge>
                  {iv.notes && <p className="text-xs text-muted-foreground">{iv.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recruiter Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Recruiter / Poster
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingRecruiter ? (
                <div className="space-y-2">
                  <Input placeholder="Name" value={recruiterForm.name} onChange={e => setRecruiterForm(p => ({ ...p, name: e.target.value }))} className="h-8" />
                  <Input placeholder="Role" value={recruiterForm.role} onChange={e => setRecruiterForm(p => ({ ...p, role: e.target.value }))} className="h-8" />
                  <Input placeholder="Email" value={recruiterForm.email} onChange={e => setRecruiterForm(p => ({ ...p, email: e.target.value }))} className="h-8" />
                  <Input placeholder="Phone" value={recruiterForm.phone} onChange={e => setRecruiterForm(p => ({ ...p, phone: e.target.value }))} className="h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7" onClick={handleSaveRecruiter}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingRecruiter(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={() => {
                    setRecruiterForm({
                      name: job.posterName || "", email: job.posterEmail || "",
                      phone: job.posterPhone || "", role: job.posterRole || "",
                    });
                    setEditingRecruiter(true);
                  }}
                >
                  {job.posterName ? (
                    <div className="space-y-1">
                      <p className="font-medium">{job.posterName}</p>
                      {job.posterRole && <p className="text-xs text-muted-foreground">{job.posterRole}</p>}
                      {job.posterEmail && <p className="text-xs text-muted-foreground">{job.posterEmail}</p>}
                      {job.posterPhone && <p className="text-xs text-muted-foreground">{job.posterPhone}</p>}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Click to add recruiter info…</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
