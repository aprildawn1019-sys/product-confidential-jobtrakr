import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, Loader2, RefreshCw, Copy, Check, AlertTriangle, CheckCircle2, FileText, Linkedin, PlusCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Snapshot {
  id: string;
  job_id: string | null;
  skills: string[];
  captured_at: string;
  source: string | null;
}

interface ProfileSkills {
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  tools_platforms: string[];
  certifications: string[];
  target_roles: string[];
}

export default function SkillsInsights() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("90");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [profileSkills, setProfileSkills] = useState<ProfileSkills | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ done: 0, total: 0 });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));

    const { data, error } = await supabase
      .from("job_skills_snapshots")
      .select("*")
      .gte("captured_at", cutoff.toISOString())
      .order("captured_at", { ascending: true });

    if (error) {
      console.error("Failed to load skills snapshots:", error);
      toast({ title: "Failed to load skills data", description: error.message, variant: "destructive" });
    }
    setSnapshots((data as any[] || []).map(d => ({ ...d, source: d.source || "tracked" })));
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // Load profile skills
  const loadProfileSkills = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("job_search_profile")
      .select("skills, technical_skills, soft_skills, tools_platforms, certifications, target_roles")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfileSkills(data as ProfileSkills);
  }, []);

  useEffect(() => {
    loadProfileSkills();
  }, [loadProfileSkills]);

  // Filter by source
  const filteredSnapshots = useMemo(() => {
    if (sourceFilter === "all") return snapshots;
    return snapshots.filter(s => (s.source || "tracked") === sourceFilter);
  }, [snapshots, sourceFilter]);

  const formatSkillLabel = (skill: string) => {
    // Full-string overrides
    const overrides: Record<string, string> = {
      "p&l": "P&L", "saas": "SaaS", "ai": "AI", "sql": "SQL", "css": "CSS",
      "html": "HTML", "api": "API", "apis": "APIs", "ui": "UI", "ux": "UX",
      "ui/ux": "UI/UX", "kpi": "KPI", "kpis": "KPIs", "roi": "ROI",
      "okr": "OKR", "okrs": "OKRs", "crm": "CRM", "b2b": "B2B", "b2c": "B2C",
      "aws": "AWS", "gcp": "GCP", "ci/cd": "CI/CD", "sdk": "SDK", "sdks": "SDKs",
      "plg": "PLG", "mvp": "MVP", "pm": "PM", "pmo": "PMO", "qa": "QA",
      "seo": "SEO", "sem": "SEM", "erp": "ERP", "etl": "ETL", "ml": "ML",
      "nlp": "NLP", "llm": "LLM", "llms": "LLMs", "devops": "DevOps",
      "devsecops": "DevSecOps", "graphql": "GraphQL", "nosql": "NoSQL",
      "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
      "dynamodb": "DynamoDB", "json": "JSON", "yaml": "YAML", "csv": "CSV",
      "rest": "REST", "oauth": "OAuth", "sso": "SSO", "rbac": "RBAC",
      "gdpr": "GDPR", "hipaa": "HIPAA", "soc": "SOC", "iso": "ISO",
      "vpc": "VPC", "dns": "DNS", "cdn": "CDN", "tcp": "TCP", "http": "HTTP",
      "https": "HTTPS", "ssh": "SSH", "ssl": "SSL", "tls": "TLS",
      "ios": "iOS", "macos": "macOS", "iot": "IoT",
      "cto": "CTO", "ceo": "CEO", "cfo": "CFO", "coo": "COO",
      "a/b": "A/B", "pr": "PR", "nps": "NPS", "cac": "CAC", "ltv": "LTV",
      "arpu": "ARPU", "arr": "ARR", "mrr": "MRR", "tam": "TAM",
    };
    if (overrides[skill]) return overrides[skill];

    // Word-level acronym detection + title case
    const acronymSet = new Set(Object.keys(overrides));
    const smallWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "as", "vs"]);

    return skill.split(/(\s+|[-/&])/).map((part, i) => {
      const lower = part.toLowerCase();
      if (overrides[lower]) return overrides[lower];
      if (/^\s+$/.test(part) || /^[-/&]$/.test(part)) return part;
      // Check if it looks like an acronym (2-5 letters, all same case in original)
      if (lower.length >= 2 && lower.length <= 5 && acronymSet.has(lower)) return overrides[lower];
      // Small words stay lowercase (except first word)
      if (i > 0 && smallWords.has(lower)) return lower;
      // Title case
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join("");
  };

  // Top Skills bar chart data
  const topSkillsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSnapshots.forEach((s) => {
      s.skills.forEach((skill) => {
        const normalized = skill.trim().toLowerCase();
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({
        skill: formatSkillLabel(skill),
        count,
      }));
  }, [filteredSnapshots]);

  // All skills ranked
  const allSkillsRanked = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSnapshots.forEach((s) => {
      s.skills.forEach((sk) => {
        const n = sk.trim().toLowerCase();
        counts[n] = (counts[n] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([skill, count]) => ({
        skill,
        label: formatSkillLabel(skill),
        count,
        pct: filteredSnapshots.length > 0 ? Math.round((count / filteredSnapshots.length) * 100) : 0,
      }));
  }, [filteredSnapshots]);

  // Skills trend data
  const { trendData, trendSkills } = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSnapshots.forEach((s) =>
      s.skills.forEach((sk) => {
        const n = sk.trim().toLowerCase();
        counts[n] = (counts[n] || 0) + 1;
      })
    );
    const top5 = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);

    if (top5.length === 0 || filteredSnapshots.length === 0) return { trendData: [], trendSkills: [] };

    const buckets: Record<string, Record<string, number>> = {};
    filteredSnapshots.forEach((s) => {
      const d = new Date(s.captured_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = {};
      s.skills.forEach((sk) => {
        const n = sk.trim().toLowerCase();
        if (top5.includes(n)) {
          buckets[key][n] = (buckets[key][n] || 0) + 1;
        }
      });
    });

    const data = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, skills]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...top5.reduce((acc, s) => ({ ...acc, [s]: skills[s] || 0 }), {}),
      }));

    return { trendData: data, trendSkills: top5 };
  }, [filteredSnapshots]);

  // Skill Gap Analysis — show ALL profile skills in "You Have", plus gap from top 20
  const { matchedSkills, gapSkills } = useMemo(() => {
    if (!profileSkills) return { matchedSkills: [], gapSkills: [] };
    const allProfileSkillsList = [
      ...profileSkills.skills,
      ...profileSkills.technical_skills,
      ...profileSkills.soft_skills,
      ...profileSkills.tools_platforms,
      ...profileSkills.certifications,
    ]
      .map(s => s.trim())
      .filter(Boolean);

    // Deduplicate by lowercase
    const seen = new Set<string>();
    const uniqueProfileSkills: string[] = [];
    for (const s of allProfileSkillsList) {
      const lower = s.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueProfileSkills.push(s);
      }
    }

    // Build a lookup of snapshot counts by lowercase skill
    const snapshotCounts: Record<string, number> = {};
    for (const r of allSkillsRanked) {
      snapshotCounts[r.skill] = r.count;
    }

    const mySkillsLower = new Set(uniqueProfileSkills.map(s => s.toLowerCase()));

    // Matched = every profile skill, with its snapshot count (0 if not in any job)
    const matched = uniqueProfileSkills.map(s => ({
      skill: s.toLowerCase(),
      label: formatSkillLabel(s),
      count: snapshotCounts[s.toLowerCase()] || 0,
      pct: filteredSnapshots.length > 0
        ? Math.round(((snapshotCounts[s.toLowerCase()] || 0) / filteredSnapshots.length) * 100)
        : 0,
    })).sort((a, b) => b.count - a.count);

    // Gap = top 20 snapshot skills NOT in profile
    const top20 = allSkillsRanked.slice(0, 20);
    const gap = top20.filter(s => !mySkillsLower.has(s.skill));

    return { matchedSkills: matched, gapSkills: gap };
  }, [profileSkills, allSkillsRanked, filteredSnapshots]);

  // Resume keywords string
  const resumeKeywords = useMemo(() => {
    return allSkillsRanked.slice(0, 20).map(s => s.label).join(", ");
  }, [allSkillsRanked]);

  // LinkedIn headline
  const linkedInHeadline = useMemo(() => {
    const roles = profileSkills?.target_roles?.slice(0, 1).map(r => r.trim()) || [];
    const topSkills = allSkillsRanked.slice(0, 4).map(s => s.label);
    const parts = [...roles, ...topSkills];
    return parts.join(" | ");
  }, [allSkillsRanked, profileSkills]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleAddSkillToProfile = useCallback(async (skillLabel: string) => {
    const skillLower = skillLabel.trim().toLowerCase();
    setAddingSkill(skillLower);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("job_search_profile")
        .select("id, skills")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        // Create profile with the skill
        await supabase.from("job_search_profile").insert({
          user_id: user.id,
          skills: [skillLabel.trim()],
        });
      } else {
        const existing = (profile.skills || []).map((s: string) => s.trim().toLowerCase());
        if (existing.includes(skillLower)) {
          toast({ title: "Already added", description: `"${skillLabel}" is already in your profile.` });
          return;
        }
        await supabase
          .from("job_search_profile")
          .update({ skills: [...(profile.skills || []), skillLabel.trim()] })
          .eq("id", profile.id);
      }

      // Update local state so UI reflects immediately
      setProfileSkills(prev => prev
        ? { ...prev, skills: [...prev.skills, skillLabel.trim()] }
        : { skills: [skillLabel.trim()], technical_skills: [], soft_skills: [], tools_platforms: [], certifications: [], target_roles: [] }
      );
      toast({ title: "Skill added!", description: `"${skillLabel}" added to your Search Profile.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to add skill", variant: "destructive" });
    } finally {
      setAddingSkill(null);
    }
  }, []);

  const handleRemoveSkillFromProfile = useCallback(async (skillLabel: string) => {
    const skillLower = skillLabel.trim().toLowerCase();
    setRemovingSkill(skillLower);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("job_search_profile")
        .select("id, skills")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;

      const updated = (profile.skills || []).filter(
        (s: string) => s.trim().toLowerCase() !== skillLower
      );

      await supabase
        .from("job_search_profile")
        .update({ skills: updated })
        .eq("id", profile.id);

      setProfileSkills(prev => prev ? { ...prev, skills: updated } : prev);
      toast({ title: "Skill removed", description: `"${skillLabel}" removed from your Search Profile.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to remove skill", variant: "destructive" });
    } finally {
      setRemovingSkill(null);
    }
  }, []);


  const handleBackfill = useCallback(async () => {
    setBackfilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all job IDs that already have snapshots
      const { data: existingSnaps } = await supabase
        .from("job_skills_snapshots")
        .select("job_id")
        .eq("user_id", user.id);
      const snappedIds = new Set((existingSnaps || []).map((s: any) => s.job_id).filter(Boolean));

      // Get jobs with descriptions but no snapshot
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, description")
        .eq("user_id", user.id)
        .not("description", "is", null);

      const toProcess = (jobsData || []).filter(
        (j: any) => j.description && j.description.length >= 20 && !snappedIds.has(j.id)
      );

      if (toProcess.length === 0) {
        // Still reload profile skills in case user updated their profile
        await loadProfileSkills();
        toast({ title: "All up to date", description: "Skills data refreshed from your profile." });
        setBackfilling(false);
        return;
      }

      setBackfillProgress({ done: 0, total: toProcess.length });

      let consecutiveErrors = 0;
      for (let i = 0; i < toProcess.length; i++) {
        const job = toProcess[i];
        try {
          const result = await Promise.race([
            supabase.functions.invoke("extract-job-skills", {
              body: { description: job.description },
            }),
            new Promise<{ data: null; error: Error }>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 20000)
            ),
          ]);
          const { data: skillsData, error: fnError } = result;
          if (fnError) {
            console.error(`Skills extraction error for job ${job.id}:`, fnError);
            consecutiveErrors++;
          } else if (skillsData?.error) {
            console.error(`Skills extraction returned error for job ${job.id}:`, skillsData.error);
            if (String(skillsData.error).includes("Rate limited") || String(skillsData.error).includes("Credits")) {
              toast({ title: "Rate limited", description: "Please try again in a few minutes.", variant: "destructive" });
              break;
            }
            consecutiveErrors++;
          } else if (skillsData?.skills?.length) {
            await supabase.from("job_skills_snapshots").insert({
              user_id: user.id,
              job_id: job.id,
              skills: skillsData.skills,
              source: "tracked",
            });
            consecutiveErrors = 0;
          }
        } catch (e) {
          console.error(`Skills extraction failed for job ${job.id}:`, e);
          consecutiveErrors++;
        }
        if (consecutiveErrors >= 3) {
          toast({ title: "Stopping early", description: "Multiple failures in a row. Try again later.", variant: "destructive" });
          break;
        }
        setBackfillProgress({ done: i + 1, total: toProcess.length });
        if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      toast({ title: "Skills refreshed!", description: `Extracted skills from ${toProcess.length} jobs.` });

      // Reload snapshots and profile skills
      await Promise.all([loadSnapshots(), loadProfileSkills()]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Backfill failed", variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  }, [loadSnapshots, loadProfileSkills]);

  const lineColors = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Skills Insights</h1>
          <p className="mt-1 text-muted-foreground">
            Analyze skills demand across {filteredSnapshots.length} tracked job descriptions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="tracked">Tracked Jobs</SelectItem>
              <SelectItem value="search">Job Search</SelectItem>
              <SelectItem value="feed">AI PM Feed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfilling}
          >
            {backfilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {backfillProgress.total > 0 && `${backfillProgress.done}/${backfillProgress.total}`}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh All Skills
              </>
            )}
          </Button>
        </div>
      </div>

      {filteredSnapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-4 opacity-40" />
            <p className="font-medium">No skills data yet</p>
            <p className="text-sm">Skills are extracted automatically when you add jobs with descriptions. Use "Refresh All Skills" to backfill existing jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume Keywords */}
          {allSkillsRanked.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Resume Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Top keywords from job descriptions — add these to your resume skills section:</p>
                <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                  {resumeKeywords}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleCopy(resumeKeywords, "resume")}
                >
                  {copiedField === "resume" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedField === "resume" ? "Copied!" : "Copy Keywords"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn Headline Builder */}
          {linkedInHeadline && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Linkedin className="h-5 w-5 text-primary" />
                  LinkedIn Headline Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Suggested headline based on top in-demand skills:</p>
                <div className="rounded-md bg-muted/50 p-3 text-sm font-medium">
                  {linkedInHeadline}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleCopy(linkedInHeadline, "linkedin")}
                >
                  {copiedField === "linkedin" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedField === "linkedin" ? "Copied!" : "Copy Headline"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Skill Gap Analysis */}
          {profileSkills && allSkillsRanked.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Skill Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      You Have ({matchedSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {matchedSkills.length === 0 && (
                        <p className="text-sm text-muted-foreground">No matching skills found. Update your profile.</p>
                      )}
                      {matchedSkills.map(s => (
                        <Badge
                          key={s.skill}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:opacity-80 transition-opacity gap-1 group/skill"
                          onClick={() => handleRemoveSkillFromProfile(s.label)}
                        >
                          {s.label}
                          {s.pct >= 50 && <span className="text-primary font-bold">★</span>}
                          {removingSkill === s.skill ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3 opacity-0 group-hover/skill:opacity-100 transition-opacity" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Skills Gap ({gapSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {gapSkills.length === 0 && (
                        <p className="text-sm text-muted-foreground">Great — you cover all top skills!</p>
                      )}
                      {gapSkills.map(s => (
                        <Badge
                          key={s.skill}
                          variant={s.pct >= 50 ? "destructive" : "outline"}
                          className="text-xs cursor-pointer hover:opacity-80 transition-opacity gap-1"
                          onClick={() => handleAddSkillToProfile(s.label)}
                        >
                          {addingSkill === s.skill ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <PlusCircle className="h-3 w-3" />
                          )}
                          {s.label}
                          <span className="text-[10px] opacity-70">({s.pct}%)</span>
                        </Badge>
                      ))}
                    </div>
                    {gapSkills.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-2">Click a skill to add it to your Search Profile</p>
                    )}
                  </div>
                </div>
                {!profileSkills.skills?.length && !profileSkills.technical_skills?.length && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    💡 Add skills to your Job Search Profile to see gap analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Skills */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top Skills in Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkillsData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="skill" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Skills Trend */}
          {trendData.length > 1 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Skills Trend Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                      {trendSkills.map((skill, i) => (
                        <Line
                          key={skill}
                          type="monotone"
                          dataKey={skill}
                          stroke={lineColors[i]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={formatSkillLabel(skill)}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
