import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, Star, MapPin, Building2, Plus, CheckCircle2, ExternalLink, Clock, User, EyeOff } from "lucide-react";
import type { Job } from "@/types/jobTracker";

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

  useEffect(() => {
    loadProfile();
    loadDismissed();
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

  const handleSearch = async () => {
    if (!profile) {
      toast({ title: "No profile found", description: "Please set up your job search profile first.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    setAddedJobs(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("ai-job-search", {
        body: { profile, dismissed: dismissedJobs },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Search failed");

      setResults(data.data || []);
      toast({ title: "Search complete!", description: `Found ${data.data?.length || 0} matching opportunities.` });
    } catch (e: any) {
      console.error("Job search error:", e);
      toast({ title: "Search failed", description: e.message || "Could not complete job search.", variant: "destructive" });
    } finally {
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
    const { error } = await supabase.from("dismissed_jobs").insert({
      company: result.company,
      title: result.title,
    });

    if (!error) {
      setDismissedJobs(prev => [...prev, { id: "", company: result.company, title: result.title }]);
      setResults(prev => prev.filter(r => !(r.company === result.company && r.title === result.title)));
      toast({ title: "Job dismissed", description: `${result.title} at ${result.company} won't appear in future searches.` });
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
    return existingJobs.some(j => j.company === result.company && j.title === result.title);
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
            {dismissedJobs.length > 0 && (
              <span className="text-xs text-muted-foreground">{dismissedJobs.length} job{dismissedJobs.length !== 1 ? "s" : ""} dismissed</span>
            )}
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
          {results.map((result, i) => {
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
                    <p className="mt-2 text-sm text-muted-foreground italic">{result.match_reason}</p>
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
    </div>
  );
}
