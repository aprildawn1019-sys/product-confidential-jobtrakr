import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, Star, MapPin, Building2, Plus, CheckCircle2, ExternalLink, Clock, User, EyeOff, Undo2, ChevronDown, ChevronUp, Globe, Settings2, XCircle, History, Trash2, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { GatedBoardsNotice } from "@/components/jobsearch/GatedBoardsNotice";
import { GatedBoardScrape } from "@/components/jobsearch/GatedBoardScrape";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CompanyAvatar from "@/components/CompanyAvatar";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Job, Contact, TargetCompany } from "@/types/jobTracker";

interface SearchParams {
  resultCount: number;
  minMatchScore: number;
  remoteOnly: boolean;
  recencyFilter: string;
  creativityLevel: string;
  focusKeywords: string;
}

interface SearchResult {
  company: string;
  title: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary: string;
  match_score: number;
  match_reason: string;
  url?: string;
  posted_ago?: string;
  hiring_contact?: string;
  job_source?: string;
  skills?: string[];
}

interface DismissedJob {
  id: string;
  company: string;
  title: string;
}

interface SearchHistoryEntry {
  id: string;
  created_at: string;
  search_params: SearchParams;
  results: SearchResult[];
  result_count: number;
}

interface JobSearchProps {
  onAddJob: (job: Omit<Job, "id" | "createdAt">) => void;
  existingJobs: Job[];
  contacts: Contact[];
  targetCompanies: TargetCompany[];
}

export default function JobSearch({ onAddJob, existingJobs, contacts, targetCompanies }: JobSearchProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [addedJobs, setAddedJobs] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [dismissedJobs, setDismissedJobs] = useState<DismissedJob[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState("");
  const [gatedBoards, setGatedBoards] = useState<{ name: string; url: string | null }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    resultCount: 10,
    minMatchScore: 60,
    remoteOnly: false,
    recencyFilter: "any",
    creativityLevel: "balanced",
    focusKeywords: "",
  });

  // Recommendations: score tracked jobs by target company, fit, urgency, contacts
  const recommendations = useMemo(() => {
    interface ScoredJob { job: Job; score: number; reasons: string[]; target?: TargetCompany; }
    const scored: ScoredJob[] = existingJobs
      .filter(j => !["rejected", "withdrawn", "closed"].includes(j.status))
      .map(job => {
        let score = 50;
        const reasons: string[] = [];
        const target = targetCompanies.find(tc => tc.status !== "archived" && companiesMatch(tc.name, job.company));
        if (target) {
          const boost = target.priority === "dream" ? 20 : target.priority === "strong" ? 15 : 10;
          score += boost;
          reasons.push(`${target.priority === "dream" ? "🌟 Dream" : target.priority === "strong" ? "💪 Strong" : "👀 Interested"} target`);
        }
        if (job.fitScore) { score += job.fitScore * 4; if (job.fitScore >= 4) reasons.push("High fit score"); }
        if (job.urgency === "high") { score += 10; reasons.push("High urgency"); }
        else if (job.urgency === "medium") { score += 5; }
        if (["applied", "screening", "interviewing"].includes(job.status)) { score += 8; reasons.push("Active in pipeline"); }
        if (job.status === "offer") { score += 15; reasons.push("Has offer"); }
        const companyContacts = contacts.filter(c => companiesMatch(c.company, job.company));
        if (companyContacts.length > 0) { score += 5 * Math.min(companyContacts.length, 3); reasons.push(`${companyContacts.length} contact${companyContacts.length > 1 ? "s" : ""}`); }
        if (job.type === "remote") score += 3;
        if (job.description) score += 2;
        score = Math.min(score, 99);
        if (reasons.length === 0) reasons.push("Matches your criteria");
        return { job, score, reasons, target };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return scored;
  }, [existingJobs, contacts, targetCompanies]);

  const getRecommendationScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    if (score >= 55) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    return "bg-muted text-muted-foreground";
  };

  useEffect(() => {
    loadProfile();
    loadDismissed();
    loadActiveBoards();
    loadSearchHistory();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("job_search_profile")
      .select("*")
      .limit(1)
      .single();
    setProfile(data);
    setLoadingProfile(false);
  };

  const loadDismissed = async () => {
    const { data } = await supabase.from("dismissed_jobs").select("*");
    if (data) setDismissedJobs(data as DismissedJob[]);
  };

  const [activeBoards, setActiveBoards] = useState<any[]>([]);
  const loadActiveBoards = async () => {
    const { data } = await supabase.from("job_boards").select("*").eq("is_active", true);
    if (data) setActiveBoards(data);
  };

  const loadSearchHistory = async () => {
    const { data } = await supabase
      .from("job_search_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setSearchHistory(data.map((d: any) => ({
      id: d.id,
      created_at: d.created_at,
      search_params: d.search_params as SearchParams,
      results: d.results as SearchResult[],
      result_count: d.result_count,
    })));
  };

  const saveSearchToHistory = async (params: SearchParams, searchResults: SearchResult[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("job_search_history").insert({
      user_id: user.id,
      search_params: params as any,
      results: searchResults as any,
      result_count: searchResults.length,
    });
    loadSearchHistory();
  };

  const deleteHistoryEntry = async (id: string) => {
    await supabase.from("job_search_history").delete().eq("id", id);
    setSearchHistory(prev => prev.filter(h => h.id !== id));
  };

  const restoreHistoryEntry = (entry: SearchHistoryEntry) => {
    setResults(entry.results);
    setViewingHistoryId(entry.id);
    setAddedJobs(new Set());
    toast({ title: "Search restored", description: `Showing ${entry.result_count} results from ${new Date(entry.created_at).toLocaleDateString()}.` });
  };

  const startTimer = () => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  useEffect(() => () => stopTimer(), []);

  // Estimate: ~8s per result requested + 10s base overhead
  const estimatedTotal = Math.max(20, searchParams.resultCount * 8 + 10);
  const progress = Math.min(elapsedSeconds / estimatedTotal, 0.95);
  const remainingSeconds = Math.max(0, Math.round(estimatedTotal - elapsedSeconds));

  const getProgressStage = () => {
    if (elapsedSeconds < 5) return "Analyzing your search profile…";
    if (elapsedSeconds < 15) return "Scraping live job boards…";
    if (elapsedSeconds < estimatedTotal * 0.5) return "Matching jobs to your skills & preferences…";
    if (elapsedSeconds < estimatedTotal * 0.8) return "Scoring and ranking results…";
    return "Finalizing results…";
  };

  const handleSearch = async () => {
    if (!profile) {
      toast({ title: "No profile found", description: "Please set up your job search profile first.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    setAddedJobs(new Set());
    const controller = new AbortController();
    abortRef.current = controller;
    startTimer();

    // Separate gated from searchable boards
    const searchableBoards = activeBoards.filter((b: any) => !b.is_gated);
    const gated = activeBoards.filter((b: any) => b.is_gated);
    setGatedBoards(gated.map((b: any) => ({ name: b.name, url: b.url })));

    try {
      // Include closed jobs in the dismissed list to prevent re-adding
      const closedJobs = existingJobs
        .filter(j => j.status === "closed")
        .map(j => ({ company: j.company, title: j.title }));
      const allExcluded = [...dismissedJobs, ...closedJobs];

      const { data, error } = await supabase.functions.invoke("ai-job-search", {
        body: { profile, dismissed: allExcluded, activeBoards: searchableBoards, searchParams },
      });

      if (controller.signal.aborted) return;

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Search failed");

      // Deduplicate by company+title, favoring entries with direct URLs
      const raw: SearchResult[] = data.data || [];
      const deduped = new Map<string, SearchResult>();
      for (const job of raw) {
        const key = `${job.company.toLowerCase().trim()}-${job.title.toLowerCase().trim()}`;
        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, job);
        } else {
          // Prefer the one with a URL, or the one with a higher match score
          const jobHasUrl = !!job.url && !job.url.includes("example.com");
          const existingHasUrl = !!existing.url && !existing.url.includes("example.com");
          if (jobHasUrl && !existingHasUrl) {
            deduped.set(key, job);
          } else if (jobHasUrl === existingHasUrl && job.match_score > existing.match_score) {
            deduped.set(key, job);
          }
        }
      }
      const uniqueResults = Array.from(deduped.values());
      setResults(uniqueResults);
      setViewingHistoryId(null);
      const meta = data.meta;
      const metaInfo = meta ? ` (${meta.realJobsFound} from live search, ${meta.aiSuggestions} AI suggestions)` : "";
      toast({ title: "Search complete!", description: `Found ${uniqueResults.length} matching opportunities${metaInfo}.` });
      // Save to search history
      if (uniqueResults.length > 0) {
        saveSearchToHistory(searchParams, uniqueResults);
        // Save skills from search results to snapshots in background
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            for (const result of uniqueResults) {
              if (result.skills && result.skills.length > 0) {
                await supabase.from("job_skills_snapshots").insert({
                  user_id: user.id,
                  skills: result.skills,
                  source: "search",
                });
              }
            }
          } catch (e) {
            console.error("Search skills snapshot save failed:", e);
          }
        })();
      }
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error("Job search error:", e);
      toast({ title: "Search failed", description: e.message || "Could not complete job search.", variant: "destructive" });
    } finally {
      abortRef.current = null;
      stopTimer();
      setSearching(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    setSearching(false);
    toast({ title: "Search cancelled", description: "The job search was stopped." });
  };

  const handleAddJob = (result: SearchResult) => {
    const key = `${result.company}-${result.title}`;
    if (addedJobs.has(key)) return;

    onAddJob({
      company: result.company,
      title: result.title,
      location: result.location,
      type: result.type,
      salary: result.salary,
      url: result.url,
      status: "saved",
      notes: `AI Match Score: ${result.match_score}/100 — ${result.match_reason}${result.hiring_contact ? `\nHiring Contact: ${result.hiring_contact}` : ""}${result.posted_ago ? `\nPosted: ${result.posted_ago}` : ""}`,
    });

    setAddedJobs(prev => new Set(prev).add(key));
    toast({ title: "Job added!", description: `${result.title} at ${result.company} added to your tracker.` });
  };

  const handleDismiss = async (result: SearchResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("dismissed_jobs").insert({
      user_id: user.id,
      company: result.company,
      title: result.title,
    });

    if (!error) {
      setDismissedJobs(prev => [...prev, { id: "", company: result.company, title: result.title }]);
      setResults(prev => prev.filter(r => !(r.company === result.company && r.title === result.title)));
      toast({ title: "Job dismissed", description: `${result.title} at ${result.company} won't appear in future searches.` });
    }
  };

  const handleUndismiss = async (dismissed: DismissedJob) => {
    const { error } = await supabase.from("dismissed_jobs").delete().eq("company", dismissed.company).eq("title", dismissed.title);
    if (!error) {
      setDismissedJobs(prev => prev.filter(d => !(d.company === dismissed.company && d.title === dismissed.title)));
      toast({ title: "Job restored", description: `${dismissed.title} at ${dismissed.company} will appear in future searches.` });
    }
  };

  const handleAddAll = () => {
    let count = 0;
    for (const result of results) {
      const key = `${result.company}-${result.title}`;
      if (addedJobs.has(key)) continue;
      const exists = existingJobs.some(j => j.company === result.company && j.title === result.title);
      if (exists) continue;

      onAddJob({
        company: result.company,
        title: result.title,
        location: result.location,
        type: result.type,
        salary: result.salary,
        url: result.url,
        status: "saved",
        notes: `AI Match Score: ${result.match_score}/100 — ${result.match_reason}${result.hiring_contact ? `\nHiring Contact: ${result.hiring_contact}` : ""}${result.posted_ago ? `\nPosted: ${result.posted_ago}` : ""}`,
      });

      setAddedJobs(prev => new Set(prev).add(key));
      count++;
    }
    toast({ title: `${count} jobs added!`, description: "All matching jobs have been added to your tracker." });
  };

  const isAlreadyTracked = (result: SearchResult) => {
    return existingJobs.some(j => j.company === result.company && j.title === result.title && j.status !== "closed");
  };

  const isClosedJob = (result: SearchResult) => {
    return existingJobs.some(j => j.company === result.company && j.title === result.title && j.status === "closed");
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-primary bg-primary/10 border-primary/30";
    if (score >= 70) return "text-accent-foreground bg-accent border-accent/50";
    return "text-muted-foreground bg-muted border-border";
  };

  if (loadingProfile) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">AI Job Search</h1>
          <p className="mt-1 text-muted-foreground">
            Find opportunities matching your profile, skills, and preferences
          </p>
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <Button variant="outline" onClick={handleAddAll}>
              <Plus className="h-4 w-4" /> Add All to Tracker
            </Button>
          )}
          {searching ? (
            <Button variant="destructive" onClick={handleCancel}>
              <XCircle className="h-4 w-4" /> Cancel Search
            </Button>
          ) : (
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" /> Search Jobs
            </Button>
          )}
        </div>
      </div>

      {/* Profile summary card */}
      {profile && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Your Search Profile</h3>
            <div className="flex items-center gap-3">
              {dismissedJobs.length > 0 && (
                <span className="text-xs text-muted-foreground">{dismissedJobs.length} job{dismissedJobs.length !== 1 ? "s" : ""} dismissed</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(prev => !prev)} className="text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                {showSettings ? "Hide Settings" : "Search Settings"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Target Roles</p>
              <p className="text-muted-foreground">{profile.target_roles?.join(", ")}</p>
            </div>
            <div>
              <p className="font-medium">Locations</p>
              <p className="text-muted-foreground">{profile.locations?.join(", ")} + Remote US</p>
            </div>
            <div>
              <p className="font-medium">Min Base Salary</p>
              <p className="text-muted-foreground">${profile.min_base_salary?.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-medium">Top Industries</p>
              <p className="text-muted-foreground">{profile.industries?.slice(0, 2).join(", ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Parameters Panel */}
      {showSettings && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5 animate-fade-in">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Search Parameters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Number of Results */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Number of Results</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[searchParams.resultCount]}
                  onValueChange={([v]) => setSearchParams(p => ({ ...p, resultCount: v }))}
                  min={4}
                  max={50}
                  step={2}
                  className="flex-1"
                />
                <span className="text-sm font-mono text-muted-foreground w-8 text-right">{searchParams.resultCount}</span>
              </div>
            </div>

            {/* Min Match Score */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Minimum Match Score</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[searchParams.minMatchScore]}
                  onValueChange={([v]) => setSearchParams(p => ({ ...p, minMatchScore: v }))}
                  min={0}
                  max={90}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-mono text-muted-foreground w-8 text-right">{searchParams.minMatchScore}%</span>
              </div>
            </div>

            {/* Creativity / Exploration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Style</Label>
              <Select value={searchParams.creativityLevel} onValueChange={(v) => setSearchParams(p => ({ ...p, creativityLevel: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative — close matches only</SelectItem>
                  <SelectItem value="balanced">Balanced — mix of close &amp; stretch</SelectItem>
                  <SelectItem value="exploratory">Exploratory — cast a wider net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Posted Within</Label>
              <Select value={searchParams.recencyFilter} onValueChange={(v) => setSearchParams(p => ({ ...p, recencyFilter: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="1week">Last week</SelectItem>
                  <SelectItem value="2weeks">Last 2 weeks</SelectItem>
                  <SelectItem value="1month">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remote Only Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Remote Only</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={searchParams.remoteOnly}
                  onCheckedChange={(v) => setSearchParams(p => ({ ...p, remoteOnly: v }))}
                />
                <span className="text-sm text-muted-foreground">{searchParams.remoteOnly ? "Yes" : "No"}</span>
              </div>
            </div>

            {/* Focus Keywords */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Focus Keywords</Label>
              <Input
                placeholder="e.g. AI strategy, P&L ownership"
                value={searchParams.focusKeywords}
                onChange={(e) => setSearchParams(p => ({ ...p, focusKeywords: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {searching && (
        <div className="rounded-xl border border-border bg-card p-8 space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium text-foreground">{getProgressStage()}</p>
            <p className="text-sm text-muted-foreground">
              {remainingSeconds > 0
                ? `Estimated ~${remainingSeconds < 60 ? `${remainingSeconds}s` : `${Math.ceil(remainingSeconds / 60)}m`} remaining`
                : "Almost done…"}
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>{elapsedSeconds}s elapsed</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
          {viewingHistoryId && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
              <History className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Viewing saved search results</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => { setResults([]); setViewingHistoryId(null); }}>
                Clear
              </Button>
            </div>
          )}
          {/* Result filter */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter results by title, company..."
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {/* Gated boards notice */}
          <GatedBoardsNotice boards={gatedBoards} />

          {/* Paste URL from gated board */}
          {gatedBoards.length > 0 && (
            <GatedBoardScrape onAddJob={onAddJob} />
          )}

          {results.filter(r => {
            const q = resultFilter.toLowerCase();
            const matchesFilter = !q || r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
            return matchesFilter && !isClosedJob(r);
          }).map((result, i) => {
            const key = `${result.company}-${result.title}`;
            const added = addedJobs.has(key);
            const tracked = isAlreadyTracked(result);

            return (
              <div key={i} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display font-semibold text-lg">{result.title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getScoreColor(result.match_score)}`}>
                        <Star className="h-3 w-3" />
                        {result.match_score}% match
                      </span>
                      <span className="capitalize text-xs rounded-full bg-muted px-2 py-0.5">{result.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{result.company}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{result.location}</span>
                      {result.salary && <span>{result.salary}</span>}
                      {result.posted_ago && (
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{result.posted_ago}</span>
                      )}
                      {result.hiring_contact && (
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{result.hiring_contact}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <p className="text-sm text-muted-foreground italic flex-1">{result.match_reason}</p>
                      {result.job_source && (
                        <span className={`inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-0.5 shrink-0 ${
                          result.job_source === "AI Suggestion"
                            ? "border-accent bg-accent/10 text-accent-foreground"
                            : "border-primary/30 bg-primary/10 text-primary"
                        }`}>
                          <Globe className="h-3 w-3" />
                          {result.job_source}
                        </span>
                      )}
                    </div>
                    {result.url && (
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> View Job Posting
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {tracked ? (
                      <Button variant="ghost" size="sm" disabled>
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Tracked
                      </Button>
                    ) : added ? (
                      <Button variant="ghost" size="sm" disabled>
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Added
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleAddJob(result)}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDismiss(result)} className="text-muted-foreground hover:text-destructive">
                      <EyeOff className="h-4 w-4" /> Hide
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!searching && results.length === 0 && !viewingHistoryId && (
        <>
          {/* Recommended for You */}
          {recommendations.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <button
                onClick={() => setShowRecommendations(prev => !prev)}
                className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-sm">Recommended for You</span>
                  <span className="text-xs text-muted-foreground">— top tracked jobs by fit, urgency &amp; network</span>
                </div>
                {showRecommendations ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showRecommendations && (
                <div className="border-t border-border divide-y divide-border">
                  {recommendations.map(({ job, score, reasons, target }) => (
                    <div key={job.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                      <CompanyAvatar company={job.company} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{job.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${getRecommendationScoreColor(score)}`}>{score}%</Badge>
                          <TargetCompanyBadge target={target} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{job.company}</span>
                          {job.location && <><span>·</span><span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.location}</span></>}
                          <span>·</span>
                          <span className="capitalize">{job.status}</span>
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {reasons.map(r => (
                            <span key={r} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{r}</span>
                          ))}
                        </div>
                      </div>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <Search className="h-10 w-10 mb-4 opacity-40" />
            <p className="font-medium">Ready to search</p>
            <p className="text-sm">Click "Search Jobs" to find opportunities matching your profile</p>
          </div>
        </>
      )}

      {/* Search History Section */}
      {searchHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" />
              Search History ({searchHistory.length})
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showHistory && (
            <div className="border-t border-border px-4 pb-4 space-y-2">
              {searchHistory.map((entry) => {
                const date = new Date(entry.created_at);
                const summary = entry.results.slice(0, 3).map(r => r.company).join(", ");
                const isViewing = viewingHistoryId === entry.id;
                return (
                  <div key={entry.id} className={`flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 ${isViewing ? "bg-primary/5 border border-primary/20" : ""}`}>
                    <div className="text-sm flex-1 min-w-0">
                      <span className="font-medium">{entry.result_count} results</span>
                      <span className="text-muted-foreground"> · {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {entry.search_params.focusKeywords && (
                        <span className="text-muted-foreground"> · "{entry.search_params.focusKeywords}"</span>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{summary}{entry.result_count > 3 ? ` +${entry.result_count - 3} more` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => restoreHistoryEntry(entry)} className="text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteHistoryEntry(entry.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dismissed Jobs Section */}
      {dismissedJobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            onClick={() => setShowDismissed(prev => !prev)}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <EyeOff className="h-4 w-4" />
              Dismissed Jobs ({dismissedJobs.length})
            </div>
            {showDismissed ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showDismissed && (
            <div className="border-t border-border px-4 pb-4 space-y-2">
              {dismissedJobs.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                  <div className="text-sm">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-muted-foreground"> at {d.company}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleUndismiss(d)} className="text-muted-foreground hover:text-foreground">
                    <Undo2 className="h-3.5 w-3.5" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
