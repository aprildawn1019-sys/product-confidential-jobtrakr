import { useState } from "react";
import { format, formatDistanceToNow, isPast, isToday, addDays } from "date-fns";
import { Mail, Linkedin, Trash2, Building2, Link2, Unlink, ChevronDown, ChevronUp, Plus, Briefcase, CalendarDays, MessageSquare, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import AddContactDialog from "@/components/AddContactDialog";
import LinkedInImportDialog from "@/components/LinkedInImportDialog";
import WarmthBadge from "@/components/WarmthBadge";
import StatusBadge from "@/components/StatusBadge";
import type { Contact, ContactConnection, ContactActivity, Job } from "@/types/jobTracker";

interface ContactsProps {
  contacts: Contact[];
  jobs: Job[];
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  onAddBulk: (contacts: Omit<Contact, "id" | "createdAt">[]) => void;
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  getConnectionsForContact: (contactId: string) => (ContactConnection & { contact?: Contact })[];
  getContactsAtSameOrg: (contactId: string) => Contact[];
  onAddConnection: (contactId1: string, contactId2: string, type?: string) => void;
  onRemoveConnection: (id: string) => void;
  // Activities
  getActivitiesForContact: (contactId: string) => ContactActivity[];
  onAddActivity: (activity: Omit<ContactActivity, "id" | "createdAt">) => void;
  onDeleteActivity: (id: string) => void;
  // Job linking
  getJobsForContact: (contactId: string) => Job[];
  onLinkContactToJob: (jobId: string, contactId: string) => void;
  onUnlinkContactFromJob: (jobId: string, contactId: string) => void;
}

function FollowUpIndicator({ date }: { date?: string }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const text = overdue
    ? `Overdue by ${formatDistanceToNow(d)}`
    : today
    ? "Follow up today"
    : `Follow up in ${formatDistanceToNow(d)}`;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] gap-1",
        overdue && "border-destructive/50 text-destructive bg-destructive/10",
        today && "border-warning/50 text-warning bg-warning/10",
        !overdue && !today && "border-info/50 text-info bg-info/10"
      )}
    >
      <CalendarDays className="h-3 w-3" />{text}
    </Badge>
  );
}

function LogActivityForm({ contactId, onAdd, onClose }: { contactId: string; onAdd: (a: Omit<ContactActivity, "id" | "createdAt">) => void; onClose: () => void }) {
  const [type, setType] = useState("email");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onAdd({ contactId, activityType: type, activityDate: date, notes: notes || undefined });
    onClose();
  };

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Log Touch</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}><X className="h-3 w-3" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email">📧 Email</SelectItem>
            <SelectItem value="call">📞 Call</SelectItem>
            <SelectItem value="meeting">🤝 Meeting</SelectItem>
            <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
            <SelectItem value="coffee">☕ Coffee</SelectItem>
            <SelectItem value="other">📝 Other</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-xs" />
      </div>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-7 text-xs" />
      <Button size="sm" className="h-7 text-xs w-full" onClick={handleSubmit}>Log Activity</Button>
    </div>
  );
}

const activityIcons: Record<string, string> = {
  email: "📧", call: "📞", meeting: "🤝", linkedin: "💼", coffee: "☕", other: "📝",
};

export default function Contacts({
  contacts, jobs, onAdd, onAddBulk, onUpdate, onDelete,
  getConnectionsForContact, getContactsAtSameOrg, onAddConnection, onRemoveConnection,
  getActivitiesForContact, onAddActivity, onDeleteActivity,
  getJobsForContact, onLinkContactToJob, onUnlinkContactFromJob,
}: ContactsProps) {
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [conversationDraft, setConversationDraft] = useState("");

  const handleSaveConversation = (contactId: string) => {
    onUpdate(contactId, { conversationLog: conversationDraft });
    setEditingConversation(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Connections</h1>
          <p className="mt-1 text-muted-foreground">{contacts.length} contacts in your network</p>
        </div>
        <div className="flex items-center gap-2">
          <LinkedInImportDialog onImport={onAddBulk} existingContacts={contacts} />
          <AddContactDialog onAdd={onAdd} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map(contact => {
          const isExpanded = expandedContact === contact.id;
          const connections = getConnectionsForContact(contact.id);
          const sameOrgContacts = getContactsAtSameOrg(contact.id);
          const connectedIds = new Set(connections.map(c => c.contactId1 === contact.id ? c.contactId2 : c.contactId1));
          const availableToConnect = contacts.filter(c => c.id !== contact.id && !connectedIds.has(c.id));
          const activities = getActivitiesForContact(contact.id);
          const linkedJobs = getJobsForContact(contact.id);
          const linkedJobIds = new Set(linkedJobs.map(j => j.id));
          const availableJobs = jobs.filter(j => !linkedJobIds.has(j.id));

          return (
            <div key={contact.id} className="rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground text-sm">
                      {contact.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h3 className="font-semibold">{contact.name}</h3>
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedContact(isExpanded ? null : contact.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(contact.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{contact.company}</p>

                {/* Indicators row */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <WarmthBadge warmth={contact.relationshipWarmth} onChange={w => onUpdate(contact.id, { relationshipWarmth: w })} />
                  <FollowUpIndicator date={contact.followUpDate} />
                  {sameOrgContacts.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />{sameOrgContacts.length} at {contact.company}
                    </Badge>
                  )}
                  {linkedJobs.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Briefcase className="h-3 w-3" />{linkedJobs.length} job{linkedJobs.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {connections.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Link2 className="h-3 w-3" />{connections.length} connection{connections.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {contact.email && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5 mr-1" />Email</a>
                    </Button>
                  )}
                  {contact.linkedin && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-3.5 w-3.5 mr-1" />LinkedIn</a>
                    </Button>
                  )}
                </div>
                {contact.lastContactedAt && (
                  <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />Last contacted: {contact.lastContactedAt}
                  </p>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Follow-up date picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Follow-up:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {contact.followUpDate ? format(new Date(contact.followUpDate), "MMM d, yyyy") : "Set date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={contact.followUpDate ? new Date(contact.followUpDate) : undefined}
                          onSelect={d => onUpdate(contact.id, { followUpDate: d ? format(d, "yyyy-MM-dd") : undefined })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {contact.followUpDate && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onUpdate(contact.id, { followUpDate: undefined })}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Linked Jobs */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Briefcase className="h-3 w-3" />Linked Jobs</p>
                    {linkedJobs.length > 0 ? (
                      <div className="space-y-1">
                        {linkedJobs.map(job => (
                          <div key={job.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{job.title}</span>
                              <span className="text-muted-foreground">at {job.company}</span>
                              <StatusBadge status={job.status} />
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUnlinkContactFromJob(job.id, contact.id)}>
                              <Unlink className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No linked jobs</p>
                    )}
                    {availableJobs.length > 0 && (
                      <Select onValueChange={jobId => onLinkContactToJob(jobId, contact.id)}>
                        <SelectTrigger className="h-7 text-xs mt-1.5">
                          <SelectValue placeholder="Link a job..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableJobs.map(j => (
                            <SelectItem key={j.id} value={j.id}>{j.title} — {j.company}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" />Activity Log</p>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setLoggingActivity(loggingActivity === contact.id ? null : contact.id)}>
                        <Plus className="h-3 w-3 mr-1" />Log Touch
                      </Button>
                    </div>
                    {loggingActivity === contact.id && (
                      <LogActivityForm contactId={contact.id} onAdd={onAddActivity} onClose={() => setLoggingActivity(null)} />
                    )}
                    {activities.length > 0 ? (
                      <div className="space-y-1 mt-1.5 max-h-32 overflow-y-auto">
                        {activities.map(a => (
                          <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span>{activityIcons[a.activityType] || "📝"}</span>
                              <span className="capitalize font-medium">{a.activityType}</span>
                              <span className="text-muted-foreground">{a.activityDate}</span>
                              {a.notes && <span className="text-muted-foreground truncate max-w-[120px]">— {a.notes}</span>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteActivity(a.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No activities logged</p>
                    )}
                  </div>

                  {/* Conversation Log */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Conversation Notes</p>
                      {editingConversation !== contact.id && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingConversation(contact.id); setConversationDraft(contact.conversationLog || ""); }}>
                          Edit
                        </Button>
                      )}
                    </div>
                    {editingConversation === contact.id ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={conversationDraft}
                          onChange={e => setConversationDraft(e.target.value)}
                          rows={3}
                          className="text-xs"
                          placeholder="Track conversation updates, key takeaways, commitments..."
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveConversation(contact.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingConversation(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {contact.conversationLog || <span className="italic">No notes yet</span>}
                      </p>
                    )}
                  </div>

                  {/* Same org contacts */}
                  {sameOrgContacts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Building2 className="h-3 w-3" />Same Organization</p>
                      {sameOrgContacts.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
                          <span>{c.name} · {c.role}</span>
                          {!connectedIds.has(c.id) && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onAddConnection(contact.id, c.id, "colleague")}>
                              <Link2 className="h-3 w-3 mr-1" />Link
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Linked connections */}
                  {connections.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 className="h-3 w-3" />Connections</p>
                      {connections.map(conn => (
                        <div key={conn.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span>{conn.contact?.name || "Unknown"}</span>
                            <Badge variant="secondary" className="text-[10px] capitalize">{conn.connectionType}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveConnection(conn.id)}>
                            <Unlink className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add connection */}
                  {availableToConnect.length > 0 && (
                    <Select onValueChange={v => onAddConnection(contact.id, v, "linkedin")}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Add a connection..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToConnect.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
