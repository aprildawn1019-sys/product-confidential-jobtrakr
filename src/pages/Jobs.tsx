import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, ExternalLink, Trash2, LayoutList, Kanban, ChevronDown, ChevronUp, Calendar, Clock, User, Users, Search, X, Sparkles, Plus, Loader2, SearchCheck, BrainCircuit, Database, ShieldAlert, Building2, FileText, Download } from "lucide-react";
import { downloadJobsCsv } from "@/lib/jobsCsvExport";
import HelpHint from "@/components/help/HelpHint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MatchScoreStars from "@/components/MatchScoreStars";
import PriorityBadge from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import StatusBadge from "@/components/StatusBadge";
import StatusSelect from "@/components/StatusSelect";
import AddJobDialog from "@/components/AddJobDialog";
import BulkJobUploadDialog from "@/components/BulkJobUploadDialog";
import JobKanban from "@/components/JobKanban";
import JobDetailPanel from "@/components/JobDetailPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Job, Contact, JobStatus, Interview, TargetCompany, JobActivity } from "@/types/jobTracker";
import { companiesMatch } from "@/stores/jobTrackerStore";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import PipelineFunnel from "@/components/PipelineFunnel";

interface JobsProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  onAdd: (job: Omit<Job, "id" | "createdAt">) => void;
  onAddBulk: (jobs: Omit<Job, "id" | "createdAt">[]) => void;
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
  getJobActivitiesForJob?: (jobId: string) => JobActivity[];
  targetCompanies?: TargetCompany[];
}

export default function Jobs({
  jobs, contacts, interviews, onAdd, onAddBulk, onUpdateStatus, onUpdateJob, onDelete,
  onLinkContact, onUnlinkContact, getContactsForJob, getNetworkMatchesForJob,
  onAddInterview, onUpdateInterview, onDeleteInterview, getJobActivitiesForJob, targetCompanies = [],
}: JobsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const highlightedJobId = searchParams.get("jobId");
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const companyFilter = searchParams.get("company");
  const [searchQuery, setSearchQuery] = useState(companyFilter || "");

  const getTargetForJob = useMemo(() => {
    const priorityOrder: Record<string, number> = { dream: 0, strong: 1, interested: 2 };
    return (job: Job) => {
      const matches = targetCompanies.filter(tc => companiesMatch(tc.name, job.company));
      if (matches.length === 0) return undefined;
      return matches.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))[0];
    };
  }, [targetCompanies]);
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [feedResults, setFeedResults] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedInitialLoading, setFeedInitialLoading] = useState(true);
  const [feedProgress, setFeedProgress] = useState({ step: 0, label: "" });
  const [addingFeedJob, setAddingFeedJob] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const { toast } = useToast();

  // Sync status filter from URL query params
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // Auto-expand and scroll to highlighted job from query param
  useEffect(() => {
    if (highlightedJobId) {
      setExpandedJob(highlightedJobId);
      // Small delay to let the DOM render the row
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [highlightedJobId]);


  const loadPersistedFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFeedInitialLoading(false); return; }
      const { data, error } = await supabase
        .from("ai_feed_jobs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setFeedResults((data as any[]).map((r: any) => ({
          title: r.title,
          company: r.company,
          location: r.location,
          type: r.type,
          salary: r.salary,
          url: r.url,
          description: r.description,
          skills: r.skills || [],
          _persistedId: r.id,
        })));
      }
    } catch (e) {
      console.error("Failed to load persisted feed:", e);
    } finally {
      setFeedInitialLoading(false);
    }
  }, []);

  useEffect(() => { loadPersistedFeed(); }, [loadPersistedFeed]);

  const toggleExpand = (id: string) => setExpandedJob(prev => prev === id ? null : id);

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const q = searchQuery.toLowerCase();
      if (q && !job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q) && !job.location.toLowerCase().includes(q)) return false;
      if (statusFilter === "active") {
        if (["saved", "rejected", "withdrawn", "closed"].includes(job.status)) return false;
      } else if (statusFilter !== "all") {
        const statuses = statusFilter.split(",");
        if (!statuses.includes(job.status)) return false;
      }
      if (priorityFilter !== "all" && (job.priority || "none") !== priorityFilter) return false;
      if (typeFilter !== "all" && job.type !== typeFilter) return false;
      if (targetFilter !== "all") {
        const tc = getTargetForJob(job);
        if (targetFilter === "any") {
          if (!tc) return false;
        } else if (targetFilter === "none") {
          if (tc) return false;
        } else {
          if (!tc || tc.priority !== targetFilter) return false;
        }
      }
      return true;
    });
  }, [jobs, searchQuery, statusFilter, priorityFilter, typeFilter, targetFilter, getTargetForJob]);

  const hasFilters = searchQuery || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all" || targetFilter !== "all";

  const feedSteps = [
    { label: "Searching job boards…", icon: SearchCheck },
    { label: "Analyzing results with AI…", icon: BrainCircuit },
    { label: "Saving to your feed…", icon: Database },
  ];

  const handleFetchAIPMFeed = async () => {
    setFeedLoading(true);
    setFeedProgress({ step: 1, label: feedSteps[0].label });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Step 1 → 2 transition after a delay (the edge function does search + AI in one call)
      const progressTimer = setTimeout(() => {
        setFeedProgress({ step: 2, label: feedSteps[1].label });
      }, 15000);

      const { data, error } = await supabase.functions.invoke("ai-pm-role-feed", {
        body: { keywords: [], locations: [] },
      });
      clearTimeout(progressTimer);
      setFeedProgress({ step: 3, label: feedSteps[2].label });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          setRateLimited(true);
          return;
        }
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setRateLimited(false);

      const newJobs: any[] = data?.jobs || [];
      if (!newJobs.length) {
        toast({ title: "No results", description: "No AI PM roles found. Try again later." });
        return;
      }

      // Build a key for dedup
      const jobKey = (j: any) => `${(j.title || "").toLowerCase().trim()}|||${(j.company || "").toLowerCase().trim()}`;

      // Already-tracked jobs in main tracker
      const trackedKeys = new Set(jobs.map(j => jobKey(j)));

      // Filter out already-tracked
      const candidateJobs = newJobs.filter(j => !trackedKeys.has(jobKey(j)));

      // Merge with existing persisted feed: keep jobs that appear in new results, add new ones, drop stale
      const newKeySet = new Set(candidateJobs.map(j => jobKey(j)));

      // Delete all existing persisted feed for this user and replace
      await supabase.from("ai_feed_jobs" as any).delete().eq("user_id", user.id);

      if (candidateJobs.length > 0) {
        const rows = candidateJobs.map((j: any) => ({
          user_id: user.id,
          title: j.title || "Untitled",
          company: j.company || "Unknown",
          location: j.location || "",
          type: j.type || "remote",
          salary: j.salary || null,
          url: j.url || null,
          description: j.description || null,
          skills: j.skills || [],
        }));

        const { data: inserted, error: insertErr } = await supabase
          .from("ai_feed_jobs" as any)
          .insert(rows)
          .select();

        if (insertErr) console.error("Failed to persist feed:", insertErr);

        const persistedResults = (inserted as any[] || []).map((r: any) => ({
          title: r.title,
          company: r.company,
          location: r.location,
          type: r.type,
          salary: r.salary,
          url: r.url,
          description: r.description,
          skills: r.skills || [],
          _persistedId: r.id,
        }));

        setFeedResults(persistedResults);
        toast({ title: "Feed updated", description: `${persistedResults.length} AI PM roles found` });

        // Extract skills from feed jobs in background
        const user2 = (await supabase.auth.getUser()).data.user;
        if (user2) {
          for (const r of (inserted as any[] || [])) {
            if (r.description && r.description.length >= 20) {
              supabase.functions.invoke("extract-job-skills", {
                body: { description: r.description },
              }).then(({ data: skillsData }) => {
                if (skillsData?.skills?.length) {
                  supabase.from("job_skills_snapshots").insert({
                    user_id: user2.id,
                    job_id: r.id,
                    skills: skillsData.skills,
                    source: "feed",
                  });
                }
              }).catch(e => console.error("Feed skills extraction failed:", e));
            }
          }
        }
      } else {
        setFeedResults([]);
        toast({ title: "No new results", description: "All found roles are already in your tracker." });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fetch AI PM roles", variant: "destructive" });
    } finally {
      setFeedLoading(false);
      setFeedProgress({ step: 0, label: "" });
    }
  };

  const handleAddFeedJob = async (feedJob: any) => {
    setAddingFeedJob(feedJob.url || feedJob.title);
    try {
      await onAdd({
        company: feedJob.company || "Unknown",
        title: feedJob.title,
        location: feedJob.location || "",
        type: feedJob.type || "remote",
        salary: feedJob.salary || undefined,
        url: feedJob.url || undefined,
        status: "saved",
        description: feedJob.description || undefined,
        source: "ai-feed",
      });
      toast({ title: "Added!", description: `${feedJob.title} at ${feedJob.company} added to tracker` });

      // Remove from persisted feed
      if (feedJob._persistedId) {
        await supabase.from("ai_feed_jobs" as any).delete().eq("id", feedJob._persistedId);
      }
      setFeedResults(prev => prev.filter(j => j !== feedJob));
    } catch {
      toast({ title: "Error", description: "Failed to add job", variant: "destructive" });
    } finally {
      setAddingFeedJob(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
                Job Pipeline
                <HelpHint articleId="pipeline-stages" />
              </h1>
              <p className="mt-1 text-muted-foreground">{filteredJobs.length} of {jobs.length} positions</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5">
                <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("list")}>
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button variant={view === "kanban" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("kanban")}>
                  <Kanban className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  if (filteredJobs.length === 0) {
                    toast({ title: "No jobs to export", description: "Adjust filters to include at least one job." });
                    return;
                  }
                  const count = downloadJobsCsv({
                    jobs: filteredJobs,
                    interviews,
                    getContactsForJob,
                    getJobActivitiesForJob,
                    getTargetForJob,
                  });
                  toast({ title: "Export ready", description: `${count} job${count === 1 ? "" : "s"} exported to CSV.` });
                }}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <BulkJobUploadDialog onAddJobs={onAddBulk} existingJobs={jobs} />
              <AddJobDialog onAdd={onAdd} contacts={contacts} />
            </div>
          </div>
          <PipelineFunnel jobs={jobs} onClickStage={(status) => setStatusFilter(status)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="ai-feed" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />AI PM Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, company, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Apps</SelectItem>
                {(["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn", "closed"] as const).map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">Not Set</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
            {targetCompanies.length > 0 && (
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger className="w-36 h-9">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Target Co." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="any">⭐ Any Target</SelectItem>
                  <SelectItem value="dream">🌟 Dream</SelectItem>
                  <SelectItem value="strong">💪 Strong</SelectItem>
                  <SelectItem value="interested">👍 Interested</SelectItem>
                  <SelectItem value="none">No Target</SelectItem>
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setPriorityFilter("all"); setTypeFilter("all"); setTargetFilter("all"); }}>
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          {view === "kanban" ? (
            <JobKanban
              jobs={filteredJobs}
              contacts={contacts}
              interviews={interviews}
              onUpdateStatus={onUpdateStatus}
              onUpdateJob={onUpdateJob}
              onDelete={onDelete}
              onLinkContact={onLinkContact}
              onUnlinkContact={onUnlinkContact}
              getContactsForJob={getContactsForJob}
              getNetworkMatchesForJob={getNetworkMatchesForJob}
              onAddInterview={onAddInterview}
              onUpdateInterview={onUpdateInterview}
              onDeleteInterview={onDeleteInterview}
              targetCompanies={targetCompanies}
            />
          ) : (
            <div className="space-y-3 mt-4">
              {filteredJobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                  <Search className="h-10 w-10 mb-4 opacity-40" />
                  <p className="font-medium">No jobs found</p>
                  <p className="text-sm">{hasFilters ? "Try adjusting your filters" : "Add your first job posting"}</p>
                </div>
              )}
              {filteredJobs.map(job => {
                const isExpanded = expandedJob === job.id;
                const linkedContacts = getContactsForJob(job.id);
                const networkMatches = getNetworkMatchesForJob(job);
                const hasNetwork = linkedContacts.length > 0 || networkMatches.length > 0;

                return (
                  <div
                    key={job.id}
                    ref={job.id === highlightedJobId ? highlightedRef : undefined}
                    className={`rounded-xl border bg-card transition-all hover:shadow-md ${job.id === highlightedJobId ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                            {job.source === "ai-feed" && (
                              <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                                <Sparkles className="h-3 w-3" />AI Feed
                              </Badge>
                            )}
                            {hasNetwork && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/contacts?jobId=${job.id}`); }}
                                  >
                                    <Users className="h-3 w-3" />{linkedContacts.length + networkMatches.length}
                                  </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-56 p-3" align="start">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">Linked Contacts</p>
                                  <div className="space-y-1.5">
                                    {linkedContacts.map(c => (
                                      <div key={c.id} className="flex items-center gap-2 text-sm">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-xs text-muted-foreground truncate ml-auto">{c.company}</span>
                                      </div>
                                    ))}
                                    {networkMatches.map(c => (
                                      <div key={c.id} className="flex items-center gap-2 text-sm opacity-70">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-xs text-muted-foreground truncate ml-auto">{c.company}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-2">Click to view in Contacts</p>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <MatchScoreStars score={job.fitScore} onChange={s => onUpdateJob(job.id, { fitScore: s || undefined })} size="sm" />
                            <PriorityBadge priority={job.priority} onChange={p => onUpdateJob(job.id, { priority: p })} />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-muted-foreground">{job.company}</p>
                            <TargetCompanyBadge target={getTargetForJob(job)} />
                          </div>
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
                          <StatusSelect value={job.status} onValueChange={v => onUpdateStatus(job.id, v as JobStatus)} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={job.url ? "" : "invisible"}
                                asChild={!!job.url}
                              >
                                {job.url ? (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer"><Building2 className="h-4 w-4" /></a>
                                ) : (
                                  <span><Building2 className="h-4 w-4" /></span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              View on {job.company}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => toggleExpand(job.id)}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {isExpanded ? "Collapse details" : "View details"}
                            </TooltipContent>
                          </Tooltip>
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
                          interviews={interviews.filter(i => i.jobId === job.id)}
                          onUpdateJob={onUpdateJob}
                          onLinkContact={onLinkContact}
                          onUnlinkContact={onUnlinkContact}
                          onAddInterview={onAddInterview}
                          onUpdateInterview={onUpdateInterview}
                          onDeleteInterview={onDeleteInterview}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai-feed">
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Discover AI Product Management roles from across the web
              </p>
              <Button onClick={handleFetchAIPMFeed} disabled={feedLoading} className="gap-2">
                {feedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {feedLoading ? "Searching..." : "Search AI PM Roles"}
              </Button>
            </div>

            {feedLoading && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">{feedProgress.label}</span>
                </div>
                <div className="flex gap-1">
                  {feedSteps.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = feedProgress.step === i + 1;
                    const isDone = feedProgress.step > i + 1;
                    return (
                      <div key={i} className="flex-1 space-y-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? "bg-primary" : isActive ? "bg-primary/60 animate-pulse" : "bg-muted"}`} />
                        <div className="flex items-center gap-1.5">
                          <StepIcon className={`h-3.5 w-3.5 ${isDone ? "text-primary" : isActive ? "text-primary/70" : "text-muted-foreground/40"}`} />
                          <span className={`text-xs ${isDone ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground/40"}`}>{step.label.replace("…", "")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rateLimited && !feedLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-destructive/30 rounded-xl bg-destructive/5">
                <ShieldAlert className="h-10 w-10 mb-4 text-destructive/60" />
                <p className="font-semibold text-destructive">Rate limit reached</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  You've reached the maximum of 3 searches per hour. Please wait a bit and try again later.
                </p>
                <p className="text-xs text-muted-foreground mt-3">Your previously saved results are still shown below.</p>
              </div>
            )}

            {feedResults.length === 0 && !feedLoading && !feedInitialLoading && !rateLimited && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Sparkles className="h-10 w-10 mb-4 opacity-40" />
                <p className="font-medium">AI PM Role Feed</p>
                <p className="text-sm">Click "Search AI PM Roles" to discover AI Product Management positions</p>
              </div>
            )}

            {feedInitialLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 opacity-40" />
                <p className="text-sm">Loading saved feed…</p>
              </div>
            )}

            {feedResults.map((feedJob, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display font-semibold text-lg">{feedJob.title}</h3>
                      <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="h-3 w-3" />AI Feed
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{feedJob.company}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {feedJob.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{feedJob.location}</span>}
                      {feedJob.type && <span className="capitalize">{feedJob.type}</span>}
                      {feedJob.salary && <span>{feedJob.salary}</span>}
                    </div>
                    {feedJob.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {feedJob.skills.slice(0, 8).map((skill: string, si: number) => (
                          <Badge key={si} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                        {feedJob.skills.length > 8 && (
                          <Badge variant="outline" className="text-xs">+{feedJob.skills.length - 8}</Badge>
                        )}
                      </div>
                    )}
                    {feedJob.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{feedJob.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {feedJob.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={feedJob.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleAddFeedJob(feedJob)}
                      disabled={addingFeedJob === (feedJob.url || feedJob.title)}
                    >
                      {addingFeedJob === (feedJob.url || feedJob.title) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add to Tracker
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
