import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, Star, MapPin, Building2, Plus, CheckCircle2, ExternalLink, Clock, User, EyeOff, Eye, Undo2, ChevronDown, ChevronUp, Globe, Settings2 } from "lucide-react";
import { GatedBoardsNotice } from "@/components/jobsearch/GatedBoardsNotice";
import { GatedBoardScrape } from "@/components/jobsearch/GatedBoardScrape";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Job } from "@/types/jobTracker";

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
}

interface DismissedJob {
  id: string;
  company: string;
  title: string;
}

interface JobSearchProps {
  onAddJob: (job: Omit<Job, "id" | "createdAt">) => void;
  existingJobs: Job[];
}

export default function JobSearch({ onAddJob, existingJobs }: JobSearchProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [addedJobs, setAddedJobs] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [dismissedJobs, setDismissedJobs] = useState<DismissedJob[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resultFilter, setResultFilter] = useState("");
  const [gatedBoards, setGatedBoards] = useState<{ name: string; url: string | null }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    resultCount: 10,
    minMatchScore: 60,
    remoteOnly: false,
    recencyFilter: "any",
    creativityLevel: "balanced",
    focusKeywords: "",
  });

  useEffect(() => {
    loadProfile();
    loadDismissed();
    loadActiveBoards();
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
      const meta = data.meta;
      const metaInfo = meta ? ` (${meta.realJobsFound} from live search, ${meta.aiSuggestions} AI suggestions)` : "";
      toast({ title: "Search complete!", description: `Found ${uniqueResults.length} matching opportunities${metaInfo}.` });
    } catch (e: any) {
      console.error("Job search error:", e);
      toast({ title: "Search failed", description: e.message || "Could not complete job search.", variant: "destructive" });
    } finally {
      stopTimer();
      setSearching(false);
    }
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
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "Searching…" : "Search Jobs"}
          </Button>
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
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="font-medium">Searching for matching opportunities…</p>
          <p className="text-sm">AI is analyzing your profile against current job market</p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
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

      {!searching && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Search className="h-10 w-10 mb-4 opacity-40" />
          <p className="font-medium">Ready to search</p>
          <p className="text-sm">Click "Search Jobs" to find opportunities matching your profile</p>
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
