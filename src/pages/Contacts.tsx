import { useState, useMemo, useEffect, useCallback } from "react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Mail, Linkedin, Trash2, Building2, Link2, Unlink, ChevronDown, ChevronUp, Plus, Briefcase, CalendarDays, MessageSquare, Clock, X, Search, LayoutGrid, Megaphone, Star, Check, ExternalLink, ArrowUpDown, Sheet, Download } from "lucide-react";
import { downloadContactsCsv } from "@/lib/contactsCsvExport";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import BulkContactUploadDialog from "@/components/BulkContactUploadDialog";
import CampaignManager from "@/components/CampaignManager";
import ContactCampaignSelect from "@/components/ContactCampaignSelect";
import WarmthBadge from "@/components/WarmthBadge";
import StatusBadge from "@/components/StatusBadge";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import ContactsSpreadsheet from "@/components/ContactsSpreadsheet";
import ContactAvatar from "@/components/ContactAvatar";
import type { Contact, ContactConnection, ContactActivity, Job, Campaign, ContactCampaign, RecommendationRequest, JobContact, TargetCompany, NetworkRole } from "@/types/jobTracker";
import { RELATIONSHIP_LABELS, NETWORK_ROLES } from "@/types/jobTracker";


import { useToast } from "@/hooks/use-toast";

interface ContactsProps {
  contacts: Contact[];
  jobs: Job[];
  campaigns: Campaign[];
  contactCampaigns: ContactCampaign[];
  jobContacts: JobContact[];
  contactConnections: ContactConnection[];
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  onAddBulk: (contacts: Omit<Contact, "id" | "createdAt">[]) => void;
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  getConnectionsForContact: (contactId: string) => (ContactConnection & { contact?: Contact })[];
  getContactsAtSameOrg: (contactId: string) => Contact[];
  onAddConnection: (contactId1: string, contactId2: string, type?: string, notes?: string, relationshipLabel?: string) => void;
  onUpdateConnection: (id: string, updates: { relationshipLabel?: string }) => void;
  onRemoveConnection: (id: string) => void;
  getActivitiesForContact: (contactId: string) => ContactActivity[];
  onAddActivity: (activity: Omit<ContactActivity, "id" | "createdAt">) => void;
  onDeleteActivity: (id: string) => void;
  getJobsForContact: (contactId: string) => Job[];
  getContactsForJob: (jobId: string) => Contact[];
  getNetworkMatchesForJob: (job: Job) => Contact[];
  onLinkContactToJob: (jobId: string, contactId: string) => void;
  onUnlinkContactFromJob: (jobId: string, contactId: string) => void;
  onAddCampaign: (campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => void;
  onDeleteCampaign: (id: string) => void;
  onToggleContactCampaign: (contactId: string, campaignId: string) => void;
  getCampaignsForContact: (contactId: string) => Campaign[];
  recommendationRequests: RecommendationRequest[];
  onAddRecommendationRequest: (req: Omit<RecommendationRequest, "id" | "createdAt">) => void;
  onUpdateRecommendationRequest: (id: string, updates: Partial<RecommendationRequest>) => void;
  onDeleteRecommendationRequest: (id: string) => void;
  getRecommendationRequestsForContact: (contactId: string) => RecommendationRequest[];
  targetCompanies: TargetCompany[];
  getTargetCompanyMatch: (companyName: string) => TargetCompany | undefined;
}

function FollowUpIndicator({ date }: { date?: string }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const text = overdue
    ? `Overdue by ${formatDistanceToNow(d)}`
    : today ? "Follow up today"
    : `Follow up in ${formatDistanceToNow(d)}`;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1",
      overdue && "border-destructive/50 text-destructive bg-destructive/10",
      today && "border-warning/50 text-warning bg-warning/10",
      !overdue && !today && "border-info/50 text-info bg-info/10"
    )}>
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
  contacts, jobs, campaigns, contactCampaigns, jobContacts, contactConnections,
  onAdd, onAddBulk, onUpdate, onDelete,
  getConnectionsForContact, getContactsAtSameOrg, onAddConnection, onUpdateConnection, onRemoveConnection,
  getActivitiesForContact, onAddActivity, onDeleteActivity,
  getJobsForContact, getContactsForJob, getNetworkMatchesForJob, onLinkContactToJob, onUnlinkContactFromJob,
  onAddCampaign, onUpdateCampaign, onDeleteCampaign, onToggleContactCampaign, getCampaignsForContact,
  recommendationRequests, onAddRecommendationRequest, onUpdateRecommendationRequest, onDeleteRecommendationRequest, getRecommendationRequestsForContact,
  targetCompanies, getTargetCompanyMatch,
}: ContactsProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdFilter = searchParams.get("jobId");
  const highlightId = searchParams.get("highlight");
  const companyFilter = searchParams.get("company");
  const actionParam = searchParams.get("action");
  const roleParam = searchParams.get("role");
  const [expandedContact, setExpandedContact] = useState<string | null>(highlightId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<{ company?: string; role?: NetworkRole }>({});

  // Open AddContactDialog when arriving with ?action=add (e.g. from sourcing panel handoff)
  useEffect(() => {
    if (actionParam === "add") {
      setAddPrefill({
        company: companyFilter || undefined,
        role: (roleParam as NetworkRole) || undefined,
      });
      setAddDialogOpen(true);
      // strip action params so re-renders don't re-trigger; keep ?company= for list context
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      next.delete("role");
      setSearchParams(next, { replace: true });
    }
  }, [actionParam, roleParam, companyFilter, searchParams, setSearchParams]);

  // Auto-scroll to highlighted contact
  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`contact-${highlightId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [highlightId]);
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [conversationDraft, setConversationDraft] = useState("");
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; contactId: string } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "spreadsheet">("grid");
  const [searchQuery, setSearchQuery] = useState(companyFilter || "");
  const [warmthFilter, setWarmthFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [recRequestContact, setRecRequestContact] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"first" | "last" | "company" | "recent">("first");

  const jobFilterLabel = useMemo(() => {
    if (!jobIdFilter) return null;
    const job = jobs.find(j => j.id === jobIdFilter);
    return job ? `${job.title} at ${job.company}` : null;
  }, [jobIdFilter, jobs]);

  const { toast } = useToast();

  const handleLinkToJob = useCallback((contactId: string, contactName: string) => {
    if (!jobIdFilter) return;
    onLinkContactToJob(jobIdFilter, contactId);
    const job = jobs.find(j => j.id === jobIdFilter);
    toast({
      title: "Contact linked",
      description: `${contactName} has been linked to ${job?.title || "the job"}.`,
    });
  }, [jobIdFilter, onLinkContactToJob, jobs, toast]);

  const handleSaveConversation = (contactId: string) => {
    onUpdate(contactId, { conversationLog: conversationDraft });
    setEditingConversation(null);
  };

  const filteredContacts = useMemo(() => {
    const filtered = contacts.filter(c => {
      // Job-linked filter: include both directly linked contacts and network matches (same company)
      if (jobIdFilter) {
        const linkedContacts = getContactsForJob(jobIdFilter);
        const job = jobs.find(j => j.id === jobIdFilter);
        const networkMatches = job ? getNetworkMatchesForJob(job) : [];
        const allMatchIds = new Set([...linkedContacts.map(lc => lc.id), ...networkMatches.map(nm => nm.id)]);
        if (!allMatchIds.has(c.id)) return false;
      }
      const q = searchQuery.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.company.toLowerCase().includes(q) && !(c.role || "").toLowerCase().includes(q)) return false;
      if (warmthFilter !== "all" && (c.relationshipWarmth || "none") !== warmthFilter) return false;
      if (followUpFilter === "overdue" && (!c.followUpDate || !isPast(new Date(c.followUpDate)) || isToday(new Date(c.followUpDate)))) return false;
      if (followUpFilter === "today" && (!c.followUpDate || !isToday(new Date(c.followUpDate)))) return false;
      if (followUpFilter === "upcoming" && (!c.followUpDate || isPast(new Date(c.followUpDate)))) return false;
      if (followUpFilter === "none" && c.followUpDate) return false;
      if (campaignFilter !== "all") {
        const contactCampaignIds = contactCampaigns.filter(cc => cc.contactId === c.id).map(cc => cc.campaignId);
        if (campaignFilter === "none") {
          if (contactCampaignIds.length > 0) return false;
        } else {
          if (!contactCampaignIds.includes(campaignFilter)) return false;
        }
      }
      if (roleFilter !== "all") {
        if (roleFilter === "none") {
          if (c.networkRole) return false;
        } else {
          if (c.networkRole !== roleFilter) return false;
        }
      }
      return true;
    });

    const getLastName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : name.toLowerCase();
    };

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "last":
          return getLastName(a.name).localeCompare(getLastName(b.name));
        case "company":
          return a.company.toLowerCase().localeCompare(b.company.toLowerCase());
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "first":
        default:
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
    });
  }, [contacts, searchQuery, warmthFilter, followUpFilter, campaignFilter, roleFilter, contactCampaigns, sortBy, jobIdFilter, jobs, getContactsForJob, getNetworkMatchesForJob]);

  const hasFilters = searchQuery || warmthFilter !== "all" || followUpFilter !== "all" || campaignFilter !== "all" || roleFilter !== "all" || !!jobIdFilter;

  const renderCampaignBadges = (contactId: string) => {
    const cmpgns = getCampaignsForContact(contactId);
    if (cmpgns.length === 0) return null;
    return cmpgns.map(c => (
      <Badge key={c.id} variant="secondary" className="text-[10px] gap-1">
        <Megaphone className="h-2.5 w-2.5" />{c.name}
      </Badge>
    ));
  };

  const renderContactCard = (contact: Contact) => {
    const isExpanded = expandedContact === contact.id;
    const connections = getConnectionsForContact(contact.id);
    const sameOrgContacts = getContactsAtSameOrg(contact.id);
    const connectedIds = new Set(connections.map(c => c.contactId1 === contact.id ? c.contactId2 : c.contactId1));
    const availableToConnect = contacts.filter(c => c.id !== contact.id && !connectedIds.has(c.id));
    const activities = getActivitiesForContact(contact.id);
    const linkedJobs = getJobsForContact(contact.id);
    const linkedJobIds = new Set(linkedJobs.map(j => j.id));
    const availableJobs = jobs.filter(j => !linkedJobIds.has(j.id));
    const contactCampaignIds = contactCampaigns.filter(cc => cc.contactId === contact.id).map(cc => cc.campaignId);

    return (
      <div key={contact.id} id={`contact-${contact.id}`} className={cn("rounded-xl border bg-card transition-shadow hover:shadow-md flex flex-col", highlightId === contact.id ? "border-primary ring-2 ring-primary/20" : "border-border")}>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <ContactAvatar name={contact.name} avatarUrl={contact.avatarUrl} size="md" />
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{contact.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{contact.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedContact(isExpanded ? null : contact.id)}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(contact.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/network")} className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1 transition-colors truncate min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{contact.company}</span><ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
            </button>
            <TargetCompanyBadge target={getTargetCompanyMatch(contact.company)} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]">
            <WarmthBadge warmth={contact.relationshipWarmth} onChange={w => onUpdate(contact.id, { relationshipWarmth: w })} />
            <FollowUpIndicator date={contact.followUpDate} />
            {renderCampaignBadges(contact.id)}
            {sameOrgContacts.length > 0 && <Badge variant="secondary" className="text-xs gap-1"><Building2 className="h-3 w-3" />{sameOrgContacts.length} at {contact.company}</Badge>}
            {linkedJobs.length > 0 && <Badge variant="outline" className="text-xs gap-1"><Briefcase className="h-3 w-3" />{linkedJobs.length} job{linkedJobs.length > 1 ? "s" : ""}</Badge>}
            {connections.length > 0 && <Badge variant="outline" className="text-xs gap-1"><Link2 className="h-3 w-3" />{connections.length} connection{connections.length > 1 ? "s" : ""}</Badge>}
            {(() => { const recs = getRecommendationRequestsForContact(contact.id); const pending = recs.filter(r => r.status === "pending").length; return pending > 0 ? <Badge variant="warning" className="text-xs gap-1"><Star className="h-3 w-3" />{pending} rec pending</Badge> : recs.some(r => r.status === "received") ? <Badge variant="success" className="text-xs gap-1"><Check className="h-3 w-3" />Rec received</Badge> : null; })()}
            {jobIdFilter && !linkedJobIds.has(jobIdFilter) && (
              <Badge
                variant="outline"
                className="text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-primary"
                onClick={() => handleLinkToJob(contact.id, contact.name)}
              >
                <Link2 className="h-3 w-3" />Link to Job
              </Badge>
            )}
            {jobIdFilter && linkedJobIds.has(jobIdFilter) && (
              <Badge variant="default" className="text-xs gap-1 bg-primary/15 text-primary border-primary/20">
                <Check className="h-3 w-3" />Linked
              </Badge>
            )}
          </div>
          <div className="mt-auto pt-3 flex items-center gap-2">
            {contact.email && <Button variant="outline" size="sm" asChild><a href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5 mr-1" />Email</a></Button>}
            {contact.linkedin && <Button variant="outline" size="sm" asChild><a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-3.5 w-3.5 mr-1" />LinkedIn</a></Button>}
          </div>
          {contact.lastContactedAt && <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Last contacted: {contact.lastContactedAt}</p>}
        </div>
        {isExpanded && renderExpandedSection(contact, connections, sameOrgContacts, connectedIds, availableToConnect, activities, linkedJobs, availableJobs, contactCampaignIds)}
      </div>
    );
  };

  const renderExpandedSection = (
    contact: Contact,
    connections: (ContactConnection & { contact?: Contact })[],
    sameOrgContacts: Contact[],
    connectedIds: Set<string>,
    availableToConnect: Contact[],
    activities: ContactActivity[],
    linkedJobs: Job[],
    availableJobs: Job[],
    contactCampaignIds: string[],
  ) => (
    <div className="border-t border-border p-4 space-y-4">
      {/* Campaigns */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Megaphone className="h-3 w-3" />Campaigns:</span>
        <ContactCampaignSelect
          campaigns={campaigns}
          selectedCampaignIds={contactCampaignIds}
          onToggle={(campaignId) => onToggleContactCampaign(contact.id, campaignId)}
        />
        {contactCampaignIds.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {getCampaignsForContact(contact.id).map(c => (
              <Badge key={c.id} variant="secondary" className="text-[10px] gap-1">
                <Megaphone className="h-2.5 w-2.5" />{c.name}
                <button onClick={() => onToggleContactCampaign(contact.id, c.id)} className="ml-0.5 hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up */}
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
            <Calendar mode="single" selected={contact.followUpDate ? new Date(contact.followUpDate) : undefined} onSelect={d => onUpdate(contact.id, { followUpDate: d ? format(d, "yyyy-MM-dd") : undefined })} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {contact.followUpDate && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onUpdate(contact.id, { followUpDate: undefined })}><X className="h-3 w-3" /></Button>}
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
        ) : <p className="text-xs text-muted-foreground italic">No linked jobs</p>}
        {availableJobs.length > 0 && (
          <Select onValueChange={jobId => onLinkContactToJob(jobId, contact.id)}>
            <SelectTrigger className="h-7 text-xs mt-1.5"><SelectValue placeholder="Link a job..." /></SelectTrigger>
            <SelectContent>{availableJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title} — {j.company}</SelectItem>)}</SelectContent>
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
        {loggingActivity === contact.id && <LogActivityForm contactId={contact.id} onAdd={onAddActivity} onClose={() => setLoggingActivity(null)} />}
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
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteActivity(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground italic">No activities logged</p>}
      </div>

      {/* Conversation Log */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Conversation Notes</p>
          {editingConversation !== contact.id && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingConversation(contact.id); setConversationDraft(contact.conversationLog || ""); }}>Edit</Button>
          )}
        </div>
        {editingConversation === contact.id ? (
          <div className="space-y-1.5">
            <Textarea value={conversationDraft} onChange={e => setConversationDraft(e.target.value)} rows={3} className="text-xs" placeholder="Track conversation updates, key takeaways, commitments..." />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveConversation(contact.id)}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingConversation(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contact.conversationLog || <span className="italic">No notes yet</span>}</p>
        )}
      </div>

      {/* Recommendation Requests */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" />Recommendation Requests</p>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setRecRequestContact(recRequestContact === contact.id ? null : contact.id)}>
            <Plus className="h-3 w-3 mr-1" />Request
          </Button>
        </div>
        {recRequestContact === contact.id && (
          <div className="rounded-md border border-border bg-card p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">New Recommendation Request</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRecRequestContact(null)}><X className="h-3 w-3" /></Button>
            </div>
            <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} id={`rec-date-${contact.id}`} className="h-7 text-xs" />
            <Input placeholder="Notes (optional)" id={`rec-notes-${contact.id}`} className="h-7 text-xs" />
            <Button size="sm" className="h-7 text-xs w-full" onClick={() => {
              const dateEl = document.getElementById(`rec-date-${contact.id}`) as HTMLInputElement;
              const notesEl = document.getElementById(`rec-notes-${contact.id}`) as HTMLInputElement;
              onAddRecommendationRequest({
                contactId: contact.id,
                requestedAt: dateEl?.value || format(new Date(), "yyyy-MM-dd"),
                status: "pending",
                notes: notesEl?.value || undefined,
              });
              setRecRequestContact(null);
            }}>Log Request</Button>
          </div>
        )}
        {(() => {
          const reqs = getRecommendationRequestsForContact(contact.id);
          return reqs.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {reqs.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.status === "received" ? "success" : r.status === "declined" ? "destructive" : "warning"} className="text-[10px] capitalize">{r.status}</Badge>
                    <span className="text-muted-foreground">Asked: {r.requestedAt}</span>
                    {r.receivedAt && <span className="text-muted-foreground">Received: {r.receivedAt}</span>}
                    {r.notes && <span className="text-muted-foreground truncate max-w-[120px]">— {r.notes}</span>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {r.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" title="Mark received" onClick={() => onUpdateRecommendationRequest(r.id, { status: "received", receivedAt: format(new Date(), "yyyy-MM-dd") })}>
                          <Check className="h-3 w-3 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" title="Mark declined" onClick={() => onUpdateRecommendationRequest(r.id, { status: "declined" })}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteRecommendationRequest(r.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground italic">No recommendation requests</p>;
        })()}
      </div>

      {/* Same org */}
      {sameOrgContacts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Building2 className="h-3 w-3" />Same Organization</p>
          {sameOrgContacts.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
              <span>{c.name} · {c.role}</span>
              {!connectedIds.has(c.id) && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onAddConnection(contact.id, c.id, "colleague", undefined, undefined)}><Link2 className="h-3 w-3 mr-1" />Link</Button>}
            </div>
          ))}
        </div>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 className="h-3 w-3" />Connections</p>
          {connections.map(conn => {
            return (
            <div key={conn.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{conn.contact?.name || "Unknown"}</span>
                <Badge variant="secondary" className="text-[10px] capitalize">{conn.connectionType}</Badge>
                <Select value={conn.relationshipLabel || ""} onValueChange={v => onUpdateConnection(conn.id, { relationshipLabel: v })}>
                  <SelectTrigger className="h-5 text-[10px] w-auto min-w-[90px] border-dashed">
                    <SelectValue placeholder="+ label" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_LABELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveConnection(conn.id)}><Unlink className="h-3 w-3 text-destructive" /></Button>
            </div>
            );
          })}
        </div>
      )}

      {availableToConnect.length > 0 && (
        <div className="space-y-1.5">
          <Select onValueChange={v => setPendingConnection({ sourceId: contact.id, contactId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add a connection..." /></SelectTrigger>
            <SelectContent>{availableToConnect.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>)}</SelectContent>
          </Select>
          {pendingConnection && pendingConnection.sourceId === contact.id && (
            <div className="flex items-center gap-1.5">
              <Select onValueChange={v => {
                onAddConnection(contact.id, pendingConnection.contactId, "linkedin", undefined, v);
                setPendingConnection(null);
              }}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Relationship..." /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_LABELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                onAddConnection(contact.id, pendingConnection.contactId, "linkedin");
                setPendingConnection(null);
              }}>Skip</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
            {(() => {
              const warm = contacts.filter(c => c.relationshipWarmth === "warm" || c.relationshipWarmth === "hot").length;
              const followUps = contacts.filter(c => c.followUpDate).length;
              return ` · ${warm} warm · ${followUps} follow-up${followUps === 1 ? "" : "s"} due`;
            })()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")} title="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "spreadsheet" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("spreadsheet")} title="Spreadsheet">
              <Sheet className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "spreadsheet" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("spreadsheet")} title="Spreadsheet">
              <Sheet className="h-4 w-4" />
            </Button>
          </div>
          <Button variant={showCampaigns ? "secondary" : "outline"} size="sm" onClick={() => setShowCampaigns(!showCampaigns)}>
            <Megaphone className="h-4 w-4 mr-1" />Campaigns
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filteredContacts.length === 0}
            onClick={() => {
              const count = downloadContactsCsv({
                contacts: filteredContacts,
                campaigns,
                jobs,
                getConnectionsForContact,
                getActivitiesForContact,
                getCampaignsForContact,
                getJobsForContact,
                getRecommendationRequestsForContact,
              });
              toast({ title: "Export ready", description: `${count} contact${count === 1 ? "" : "s"} exported (current filter).` });
            }}
            title="Export current filter as CSV"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <BulkContactUploadDialog onAddBulk={onAddBulk} existingContacts={contacts} />
          <LinkedInImportDialog onImport={onAddBulk} existingContacts={contacts} />
          <AddContactDialog
            onAdd={onAdd}
            open={addDialogOpen}
            onOpenChange={(v) => { setAddDialogOpen(v); if (!v) setAddPrefill({}); }}
            defaultCompany={addPrefill.company}
            defaultNetworkRole={addPrefill.role}
          />
        </div>
      </div>

      {/* Campaign Manager Panel */}
      {showCampaigns && (
        <div className="rounded-xl border border-border bg-card p-4">
          <CampaignManager
            campaigns={campaigns}
            contactCounts={Object.fromEntries(campaigns.map(c => [c.id, contactCampaigns.filter(cc => cc.campaignId === c.id).length]))}
            onAdd={onAddCampaign}
            onUpdate={onUpdateCampaign}
            onDelete={onDeleteCampaign}
          />
        </div>
      )}

      {/* Job filter banner */}
      {jobIdFilter && jobFilterLabel && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <Briefcase className="h-4 w-4 text-primary shrink-0" />
          <span>Showing contacts linked to <strong>{jobFilterLabel}</strong></span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSearchParams({})}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, company, role..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={warmthFilter} onValueChange={setWarmthFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Warmth" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warmth</SelectItem>
            <SelectItem value="cold">❄️ Cold</SelectItem>
            <SelectItem value="warm">🌤️ Warm</SelectItem>
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="champion">🏆 Champion</SelectItem>
            <SelectItem value="none">Not Set</SelectItem>
          </SelectContent>
        </Select>
        <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Follow-up" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="none">No Follow-up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="none">No Role</SelectItem>
            {NETWORK_ROLES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.emoji} {r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            <SelectItem value="none">No Campaign</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-40 h-9"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="first">First Name A–Z</SelectItem>
            <SelectItem value="last">Last Name A–Z</SelectItem>
            <SelectItem value="company">Company A–Z</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchQuery(""); setWarmthFilter("all"); setFollowUpFilter("all"); setCampaignFilter("all"); if (jobIdFilter) setSearchParams({}); }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>


      {filteredContacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Search className="h-10 w-10 mb-4 opacity-40" />
          <p className="font-medium">No contacts found</p>
          <p className="text-sm">{hasFilters ? "Try adjusting your filters" : "Add your first contact"}</p>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map(renderContactCard)}
        </div>
      ) : (
        <ContactsSpreadsheet
          contacts={filteredContacts}
          campaigns={campaigns}
          contactCampaigns={contactCampaigns}
          targetCompanies={targetCompanies}
          getTargetCompanyMatch={getTargetCompanyMatch}
          getCampaignsForContact={getCampaignsForContact}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleContactCampaign={onToggleContactCampaign}
        />
      )}
    </div>
  );
}
