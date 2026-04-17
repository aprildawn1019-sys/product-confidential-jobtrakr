import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Star,
  CalendarCheck,
  Trophy,
  ArrowRight,
  Sparkles,
  Check,
  Circle,
  Compass,
  UserCog,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Contact, TargetCompany, Interview } from "@/types/jobTracker";

interface GettingStartedProps {
  jobs?: Job[];
  contacts?: Contact[];
  targetCompanies?: TargetCompany[];
  interviews?: Interview[];
  coverLetterCount?: number;
}

/**
 * Getting Started — persona-driven entry points (prototype v2).
 * Keeps the session-progress checklist so returning users still see momentum.
 */
export default function GettingStarted({
  jobs = [],
  contacts = [],
  targetCompanies = [],
  interviews = [],
}: GettingStartedProps) {
  const navigate = useNavigate();
  const [profileScore, setProfileScore] = useState<number | null>(null);

  const startTour = () => window.dispatchEvent(new Event("jobtrakr:start-tour"));

  /* ── Compute profile completeness (5 key fields) ──────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setProfileScore(0);
        return;
      }
      const { data } = await supabase
        .from("job_search_profile")
        .select("target_roles, locations, skills, summary, min_base_salary")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        setProfileScore(0);
        return;
      }
      let score = 0;
      if (data.target_roles?.length) score++;
      if (data.locations?.length) score++;
      if (data.skills?.length) score++;
      if (data.summary && data.summary.trim().length > 0) score++;
      if (data.min_base_salary && data.min_base_salary > 0) score++;
      setProfileScore(score);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profileComplete = profileScore !== null && profileScore >= 5;
  const profileIncomplete = profileScore !== null && profileScore < 5;

  /* ── Session milestones (kept from previous version) ──────────── */
  const milestones = useMemo(
    () => [
      {
        label: "Added your first job",
        done: jobs.length > 0,
        cta: "Add a job",
        onClick: () => navigate("/jobs"),
      },
      {
        label: "Added a contact",
        done: contacts.length > 0,
        cta: "Add a contact",
        onClick: () => navigate("/contacts"),
      },
      {
        label: "Set a target company",
        done: targetCompanies.length > 0,
        cta: "Add a company",
        onClick: () => navigate("/target-companies"),
      },
      {
        label: "Applied to a role",
        done: jobs.some((j) => ["applied", "screening", "interviewing", "offer"].includes(j.status)),
        cta: "Mark as applied",
        onClick: () => navigate("/jobs"),
      },
      {
        label: "Scheduled an interview",
        done: interviews.length > 0,
        cta: "Schedule one",
        onClick: () => navigate("/interviews"),
      },
    ],
    [jobs, contacts, targetCompanies, interviews, navigate],
  );

  const completedCount = milestones.filter((m) => m.done).length;
  const progressPct = Math.round((completedCount / milestones.length) * 100);
  const allDone = completedCount === milestones.length;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3 gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Getting Started
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Pick the way you want to start your search
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Jobtrakr isn't linear. Choose the entry point that matches where you are today —
            every path feeds into the same unified pipeline.
          </p>
        </div>
        <Button onClick={startTour} className="gap-2">
          <Sparkles className="h-4 w-4" /> Take the tour
        </Button>
      </header>

      {/* Profile completeness banner */}
      {profileScore !== null && !profileComplete && (
        <ProfileCompletenessBanner
          score={profileScore}
          onAction={() => navigate("/profile")}
        />
      )}

      {/* Persona entry cards */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Choose your entry point
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EntryCard
            number={1}
            icon={Compass}
            title="I'm just getting started"
            persona="Beginner Bob"
            description="No roles in mind yet? Set up your profile, pick the job boards you want to monitor, and we'll surface roles that fit."
            steps={["Set up your profile", "Add job boards to monitor", "Run your first search"]}
            cta="Start setup"
            onClick={() => navigate("/profile")}
            accent="neutral"
            tip={profileIncomplete ? "Recommended — your profile isn't complete yet" : undefined}
            tourId="entry-beginner"
          />
          <EntryCard
            number={2}
            icon={Search}
            title="Search for jobs"
            persona="Searcher Sam"
            description="Already know the role you want? Start with AI-powered search, browse curated boards, or bulk-import a list of openings."
            steps={["AI Job Search", "Job Boards", "Bulk Import"]}
            cta="Open AI Job Search"
            onClick={() => navigate("/job-search")}
            accent="info"
            tip={profileIncomplete ? "Tip: a complete profile improves results" : undefined}
            tourId="entry-job-search"
          />
          <EntryCard
            number={3}
            icon={Users}
            title="Network first"
            persona="Networker Nora"
            description="Prefer relationship-driven searches? Add contacts, log conversations, and let opportunities surface from your network."
            steps={["Add Contacts", "Log Activity & Warmth", "Network Map"]}
            cta="Open Connections"
            onClick={() => navigate("/contacts")}
            accent="success"
            tip={profileIncomplete ? "Tip: a complete profile improves results" : undefined}
            tourId="entry-network"
          />
          <EntryCard
            number={4}
            icon={Star}
            title="Start with target companies"
            persona="Targeter Tara"
            description="Have a dream-employer shortlist? Add them, set priorities, then discover roles and contacts within each company."
            steps={["Add Companies", "Set Priority", "Find Jobs & Contacts"]}
            cta="Open Target Companies"
            onClick={() => navigate("/target-companies")}
            accent="warning"
            tip={profileIncomplete ? "Tip: a complete profile improves results" : undefined}
            tourId="entry-target-companies"
          />
        </div>
      </section>

      {/* Session progress checklist (kept — useful for returning users) */}
      <section>
        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Your progress
          </h2>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {milestones.length} complete
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-5">
            <Progress value={progressPct} className="h-2 flex-1" />
            <span className="font-display text-sm font-semibold tabular-nums w-10 text-right">
              {progressPct}%
            </span>
          </div>
          <ul className="space-y-2">
            {milestones.map((m) => (
              <li
                key={m.label}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  m.done
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-background hover:border-primary/30"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    m.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                </div>
                <span
                  className={`flex-1 text-sm ${
                    m.done ? "text-foreground/70 line-through" : "text-foreground font-medium"
                  }`}
                >
                  {m.label}
                </span>
                {!m.done && (
                  <Button variant="ghost" size="sm" onClick={m.onClick} className="gap-1 text-xs">
                    {m.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {allDone && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
              <Trophy className="h-4 w-4 text-accent-foreground" />
              <span className="font-medium">You're all set up — happy hunting!</span>
            </div>
          )}
        </div>
      </section>

      {/* Quick actions footer */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 sm:p-8 text-center">
        <h3 className="font-display text-xl font-bold tracking-tight">Need a different door in?</h3>
        <p className="mt-2 text-muted-foreground">Jump straight to a specific tool, or take the guided tour.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/jobs")} className="gap-1.5">
            <CalendarCheck className="h-4 w-4" /> Job Tracker
          </Button>
          <Button variant="outline" onClick={() => navigate("/interviews")} className="gap-1.5">
            <CalendarCheck className="h-4 w-4" /> Schedule
          </Button>
          <Button variant="outline" onClick={() => navigate("/skills-insights")} className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Skills Insights
          </Button>
          <Button onClick={startTour} className="gap-2">
            <Sparkles className="h-4 w-4" /> Take the tour
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function ProfileCompletenessBanner({ score, onAction }: { score: number; onAction: () => void }) {
  const pct = (score / 5) * 100;
  const isWarn = score < 3;

  let title: string;
  let sub: string;
  if (score === 0) {
    title = "Set up your search profile";
    sub = "Add your target roles, locations, and skills so we can match jobs and contacts to what you actually want.";
  } else if (score < 3) {
    title = `Your profile is ${score} of 5 complete`;
    sub = "A complete profile improves match quality across search, recommendations, and cover letters.";
  } else {
    title = `Sharpen your profile (${score} of 5)`;
    sub = "Just a couple more fields and your matches and AI suggestions get noticeably sharper.";
  }

  const tone = isWarn
    ? "border-warning/55 bg-warning/10"
    : "border-info/45 bg-info/10";
  const iconTone = isWarn
    ? "bg-warning/20 text-warning-foreground"
    : "bg-info/15 text-info";

  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 sm:p-5 shadow-sm ${tone}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        <UserCog className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="font-semibold text-sm">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        <div className="mt-2 max-w-xs">
          <Progress value={pct} className="h-1.5" />
        </div>
      </div>
      <Button onClick={onAction} className="gap-1.5">
        Complete profile
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface EntryCardProps {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  persona: string;
  description: string;
  steps: string[];
  cta: string;
  onClick: () => void;
  accent: "neutral" | "info" | "success" | "warning";
  tip?: string;
  tourId?: string;
}

function EntryCard({
  number,
  icon: Icon,
  title,
  persona,
  description,
  steps,
  cta,
  onClick,
  accent,
  tip,
  tourId,
}: EntryCardProps) {
  const accentClasses: Record<string, string> = {
    neutral: "bg-muted/60 text-muted-foreground border-border",
    info: "bg-info/10 text-info border-info/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tourId}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent/55 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-serif text-[1.75rem] font-bold leading-none text-muted-foreground/35 tabular-nums">
          0{number}
        </span>
      </div>
      <h3 className="text-[1.05rem] font-semibold tracking-tight leading-snug">{title}</h3>
      <div className="mt-0.5 text-[0.78rem] font-medium text-muted-foreground">{persona}</div>
      <p className="mt-2 text-[0.85rem] text-muted-foreground leading-relaxed flex-1">{description}</p>
      <ul className="mt-4 space-y-1.5">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-2 text-[0.82rem] text-foreground/85">
            <span className="h-[5px] w-[5px] rounded-full bg-accent/70" />
            {step}
          </li>
        ))}
      </ul>
      {tip && (
        <div className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-warning-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{tip}</span>
        </div>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/90 group-hover:text-accent">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
