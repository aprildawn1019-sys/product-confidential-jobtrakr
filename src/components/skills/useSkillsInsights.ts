import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Snapshot, ProfileSkills, RankedSkill, formatSkillLabel } from "./skillsInsightsUtils";

export function useSkillsInsights() {
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
  const [trendScale, setTrendScale] = useState<"weeks" | "months">("weeks");
  const [aiResumeKeywords, setAiResumeKeywords] = useState<string | null>(null);
  const [aiLinkedInHeadline, setAiLinkedInHeadline] = useState<string | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatingLinkedIn, setGeneratingLinkedIn] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

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

  useEffect(() => { loadProfileSkills(); }, [loadProfileSkills]);

  const filteredSnapshots = useMemo(() => {
    if (sourceFilter === "all") return snapshots;
    return snapshots.filter(s => (s.source || "tracked") === sourceFilter);
  }, [snapshots, sourceFilter]);

  // Top Skills — current demand (most recent 30 days)
  const topSkillsData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentSnapshots = filteredSnapshots.filter(s => new Date(s.captured_at) >= cutoff);
    const source = recentSnapshots.length > 0 ? recentSnapshots : filteredSnapshots;
    const counts: Record<string, number> = {};
    source.forEach(s => s.skills.forEach(skill => {
      const n = skill.trim().toLowerCase();
      counts[n] = (counts[n] || 0) + 1;
    }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill: formatSkillLabel(skill), count }));
  }, [filteredSnapshots]);

  // All skills ranked
  const allSkillsRanked: RankedSkill[] = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSnapshots.forEach(s => s.skills.forEach(sk => {
      const n = sk.trim().toLowerCase();
      counts[n] = (counts[n] || 0) + 1;
    }));
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
    filteredSnapshots.forEach(s => s.skills.forEach(sk => {
      const n = sk.trim().toLowerCase();
      counts[n] = (counts[n] || 0) + 1;
    }));
    const top5 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
    if (top5.length === 0) return { trendData: [], trendSkills: [] };

    const now = new Date();
    const allBucketKeys: string[] = [];
    if (trendScale === "months") {
      const monthCount = Math.max(1, Math.ceil(parseInt(dateRange) / 30));
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        allBucketKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    } else {
      const weekCount = Math.max(1, Math.ceil(parseInt(dateRange) / 7));
      for (let i = weekCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        d.setDate(d.getDate() - d.getDay());
        const key = d.toISOString().slice(0, 10);
        if (!allBucketKeys.includes(key)) allBucketKeys.push(key);
      }
    }

    const buckets: Record<string, Record<string, number>> = {};
    allBucketKeys.forEach(k => { buckets[k] = {}; });
    filteredSnapshots.forEach(s => {
      const d = new Date(s.captured_at);
      let key: string;
      if (trendScale === "months") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      }
      if (!buckets[key]) buckets[key] = {};
      s.skills.forEach(sk => {
        const n = sk.trim().toLowerCase();
        if (top5.includes(n)) buckets[key][n] = (buckets[key][n] || 0) + 1;
      });
    });

    const data = allBucketKeys.map(bucket => ({
      week: trendScale === "months"
        ? new Date(bucket + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : new Date(bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...top5.reduce((acc, s) => ({ ...acc, [s]: (buckets[bucket] || {})[s] || 0 }), {}),
    }));
    return { trendData: data, trendSkills: top5 };
  }, [filteredSnapshots, trendScale, dateRange]);

  // Skill Gap Analysis
  const { matchedSkills, gapSkills } = useMemo(() => {
    if (!profileSkills) return { matchedSkills: [], gapSkills: [] };
    const allProfileSkillsList = [
      ...profileSkills.skills, ...profileSkills.technical_skills,
      ...profileSkills.soft_skills, ...profileSkills.tools_platforms,
      ...profileSkills.certifications,
    ].map(s => s.trim()).filter(Boolean);

    const seen = new Set<string>();
    const uniqueProfileSkills: string[] = [];
    for (const s of allProfileSkillsList) {
      const lower = s.toLowerCase();
      if (!seen.has(lower)) { seen.add(lower); uniqueProfileSkills.push(s); }
    }

    const snapshotCounts: Record<string, number> = {};
    for (const r of allSkillsRanked) snapshotCounts[r.skill] = r.count;
    const mySkillsLower = new Set(uniqueProfileSkills.map(s => s.toLowerCase()));

    const matched = uniqueProfileSkills.map(s => ({
      skill: s.toLowerCase(),
      label: formatSkillLabel(s),
      count: snapshotCounts[s.toLowerCase()] || 0,
      pct: filteredSnapshots.length > 0 ? Math.round(((snapshotCounts[s.toLowerCase()] || 0) / filteredSnapshots.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const gap = allSkillsRanked.slice(0, 20).filter(s => !mySkillsLower.has(s.skill));
    return { matchedSkills: matched, gapSkills: gap };
  }, [profileSkills, allSkillsRanked, filteredSnapshots]);

  const resumeKeywords = useMemo(() => allSkillsRanked.slice(0, 20).map(s => s.label).join(", "), [allSkillsRanked]);

  const linkedInHeadline = useMemo(() => {
    const roles = profileSkills?.target_roles?.slice(0, 1).map(r => r.trim()) || [];
    const topSkills = allSkillsRanked.slice(0, 4).map(s => s.label);
    return [...roles, ...topSkills].join(" | ");
  }, [allSkillsRanked, profileSkills]);

  // --- Handlers ---

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleGenerateAIContent = useCallback(async (type: "resume_keywords" | "linkedin_headline") => {
    const isResume = type === "resume_keywords";
    const setGenerating = isResume ? setGeneratingResume : setGeneratingLinkedIn;
    const setContent = isResume ? setAiResumeKeywords : setAiLinkedInHeadline;
    setGenerating(true);
    try {
      const topSkills = allSkillsRanked.slice(0, 20).map(s => s.label);
      const { data, error } = await supabase.functions.invoke("generate-skills-content", {
        body: { type, topSkills, profileSummary: profileSkills?.skills?.join(", ") || "", targetRoles: profileSkills?.target_roles || [] },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      setContent(data.content);
      toast({ title: isResume ? "Keywords generated!" : "Headline generated!", description: "AI-optimized content is ready." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [allSkillsRanked, profileSkills]);

  const handleAddSkillToProfile = useCallback(async (skillLabel: string) => {
    const skillLower = skillLabel.trim().toLowerCase();
    setAddingSkill(skillLower);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("job_search_profile").select("id, skills").eq("user_id", user.id).maybeSingle();
      if (!profile) {
        await supabase.from("job_search_profile").insert({ user_id: user.id, skills: [skillLabel.trim()] });
      } else {
        const existing = (profile.skills || []).map((s: string) => s.trim().toLowerCase());
        if (existing.includes(skillLower)) { toast({ title: "Already added" }); return; }
        await supabase.from("job_search_profile").update({ skills: [...(profile.skills || []), skillLabel.trim()] }).eq("id", profile.id);
      }
      setProfileSkills(prev => prev ? { ...prev, skills: [...prev.skills, skillLabel.trim()] } : { skills: [skillLabel.trim()], technical_skills: [], soft_skills: [], tools_platforms: [], certifications: [], target_roles: [] });
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
      const { data: profile } = await supabase.from("job_search_profile").select("id, skills").eq("user_id", user.id).maybeSingle();
      if (!profile) return;
      const updated = (profile.skills || []).filter((s: string) => s.trim().toLowerCase() !== skillLower);
      await supabase.from("job_search_profile").update({ skills: updated }).eq("id", profile.id);
      setProfileSkills(prev => prev ? { ...prev, skills: updated } : prev);
      toast({ title: "Skill removed", description: `"${skillLabel}" removed from your Search Profile.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to remove skill", variant: "destructive" });
    } finally {
      setRemovingSkill(null);
    }
  }, []);

  const processJobs = async (jobs: any[], userId: string) => {
    let consecutiveErrors = 0;
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        const result = await Promise.race([
          supabase.functions.invoke("extract-job-skills", { body: { description: job.description } }),
          new Promise<{ data: null; error: Error }>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000)),
        ]);
        const { data: skillsData, error: fnError } = result;
        if (fnError) { consecutiveErrors++; }
        else if (skillsData?.error) {
          if (String(skillsData.error).includes("Rate limited") || String(skillsData.error).includes("Credits")) {
            toast({ title: "Rate limited", description: "Please try again in a few minutes.", variant: "destructive" });
            break;
          }
          consecutiveErrors++;
        } else if (skillsData?.skills?.length) {
          await supabase.from("job_skills_snapshots").insert({ user_id: userId, job_id: job.id, skills: skillsData.skills, source: "tracked", captured_at: job.created_at });
          consecutiveErrors = 0;
        }
      } catch {
        consecutiveErrors++;
      }
      if (consecutiveErrors >= 3) {
        toast({ title: "Stopping early", description: "Multiple failures in a row. Try again later.", variant: "destructive" });
        break;
      }
      setBackfillProgress({ done: i + 1, total: jobs.length });
      if (i < jobs.length - 1) await new Promise(r => setTimeout(r, 500));
    }
  };

  const handleBackfill = useCallback(async () => {
    setBackfilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: existingSnaps } = await supabase.from("job_skills_snapshots").select("job_id").eq("user_id", user.id);
      const snappedIds = new Set((existingSnaps || []).map((s: any) => s.job_id).filter(Boolean));
      const { data: jobsData } = await supabase.from("jobs").select("id, description, created_at").eq("user_id", user.id).not("description", "is", null);
      const toProcess = (jobsData || []).filter((j: any) => j.description && j.description.length >= 20 && !snappedIds.has(j.id));
      if (toProcess.length === 0) {
        await loadProfileSkills();
        toast({ title: "All up to date", description: "Skills data refreshed from your profile." });
        setBackfilling(false);
        return;
      }
      setBackfillProgress({ done: 0, total: toProcess.length });
      await processJobs(toProcess, user.id);
      toast({ title: "Skills refreshed!", description: `Extracted skills from ${toProcess.length} jobs.` });
      await Promise.all([loadSnapshots(), loadProfileSkills()]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Backfill failed", variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  }, [loadSnapshots, loadProfileSkills]);

  const handleResetAndReextract = useCallback(async () => {
    if (!confirm("This will delete all existing skill snapshots and re-extract from every job. Continue?")) return;
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: delError } = await supabase.from("job_skills_snapshots").delete().eq("user_id", user.id);
      if (delError) throw delError;
      const { data: jobsData } = await supabase.from("jobs").select("id, description, created_at").eq("user_id", user.id).not("description", "is", null);
      const toProcess = (jobsData || []).filter((j: any) => j.description && j.description.length >= 20);
      if (toProcess.length === 0) {
        await Promise.all([loadSnapshots(), loadProfileSkills()]);
        toast({ title: "Reset complete", description: "No jobs with descriptions to process." });
        setResetting(false);
        return;
      }
      setBackfillProgress({ done: 0, total: toProcess.length });
      await processJobs(toProcess, user.id);
      toast({ title: "Reset & re-extract complete!", description: `Processed ${toProcess.length} jobs with correct dates.` });
      await Promise.all([loadSnapshots(), loadProfileSkills()]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Reset failed", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  }, [loadSnapshots, loadProfileSkills]);

  return {
    loading, filteredSnapshots, dateRange, setDateRange, sourceFilter, setSourceFilter,
    trendScale, setTrendScale, backfilling, resetting, backfillProgress,
    copiedField, addingSkill, removingSkill, generatingResume, generatingLinkedIn,
    aiResumeKeywords, aiLinkedInHeadline,
    topSkillsData, allSkillsRanked, trendData, trendSkills,
    matchedSkills, gapSkills, resumeKeywords, linkedInHeadline, profileSkills,
    handleCopy, handleGenerateAIContent, handleAddSkillToProfile,
    handleRemoveSkillFromProfile, handleBackfill, handleResetAndReextract,
  };
}
