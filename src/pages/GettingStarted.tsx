import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Compass,
  Info,
  Search,
  Sparkles,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, Interview, Job, TargetCompany } from "@/types/jobTracker";

interface GettingStartedProps {
  jobs?: Job[];
  contacts?: Contact[];
  targetCompanies?: TargetCompany[];
  interviews?: Interview[];
  coverLetterCount?: number;
}

interface EntryPath {
  number: string;
  title: string;
  persona: string;
  description: string;
  steps: string[];
  cta: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  tone: "neutral" | "info" | "success" | "warning";
  featured?: boolean;
  note?: string;
  tourId?: string;
}

export default function GettingStarted({
  jobs = [],
  contacts = [],
  targetCompanies = [],
  interviews = [],
}: GettingStartedProps) {
  const navigate = useNavigate();
  const [profileScore, setProfileScore] = useState<number | null>(null);

  const startTour = () => window.dispatchEvent(new Event("jobtrakr:start-tour"));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      if (data.target_roles?.length) score += 1;
      if (data.locations?.length) score += 1;
      if (data.skills?.length) score += 1;
      if (data.summary?.trim()) score += 1;
      if (data.min_base_salary && data.min_base_salary > 0) score += 1;

      setProfileScore(score);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const profileIncomplete = profileScore !== null && profileScore < 5;

  const entryPaths = useMemo<EntryPath[]>(
    () => [
      {
        number: "01",
        title: "Build your foundation",
        persona: "Beginner Bob",
        description:
          "Start by defining the roles, locations, and skills you care about so every downstream tool feels personalized.",
        steps: ["Complete profile", "Choose boards", "Run first search"],
        cta: "Open Profile",
        route: "/profile",
        icon: Compass,
        tone: "neutral",
        featured: profileIncomplete,
        note: profileIncomplete ? "Best first step if your search profile is still incomplete." : undefined,
      },
      {
        number: "02",
        title: "Search for live roles",
        persona: "Searcher Sam",
        description:
          "Use AI-powered role discovery, curated job boards, and imports when you already know what kind of opportunity you want.",
        steps: ["AI Job Search", "Browse boards", "Import openings"],
        cta: "Open Job Search",
        route: "/job-search",
        icon: Search,
        tone: "info",
        note: profileIncomplete ? "Results sharpen when your profile is fully filled out." : undefined,
      },
      {
        number: "03",
        title: "Lead with relationships",
        persona: "Networker Nora",
        description:
          "Track warm contacts, follow-ups, and introductions so your search grows through conversations instead of cold applications.",
        steps: ["Add contacts", "Log activity", "View network map"],
        cta: "Open Contacts",
        route: "/contacts",
        icon: Users,
        tone: "success",
      },
      {
        number: "04",
        title: "Target dream companies",
        persona: "Targeter Tara",
        description:
          "Create a focused company list, assign priority, and work backward from the organizations you care about most.",
        steps: ["Add companies", "Set priority", "Track roles & people"],
        cta: "Open Targets",
        route: "/target-companies",
        icon: Star,
        tone: "warning",
      },
    ],
    [profileIncomplete],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-card to-accent/10 p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-primary/5 to-transparent lg:block" />
          <div className="relative max-w-3xl">
            <Badge variant="outline" className="mb-4 gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Getting Started
            </Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Choose the job search path that matches how you actually work.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pick a starting point below — your profile, live roles, your network, or your target companies. Every path feeds the same unified pipeline.
            </p>



            <div className="mt-8">
              <Button onClick={startTour} className="gap-2">
                <Sparkles className="h-4 w-4" /> Take the tour
              </Button>
            </div>
          </div>
        </div>
      </section>

      {profileScore !== null && profileScore < 5 && (
        <ProfileCompletenessBanner score={profileScore} onAction={() => navigate("/profile")} />
      )}

      <section>
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Entry paths
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Where do you want to start?
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {entryPaths.map((path) => (
            <EntryPrototypeCard key={path.number} path={path} onClick={() => navigate(path.route)} />
          ))}
        </div>
      </section>

      <section>
        <div className="rounded-[1.75rem] border border-border bg-gradient-to-br from-card to-muted/50 p-6 shadow-sm sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Quick launchers
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
            Jump straight to a tool
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Already know what you need? Open the tracker, your schedule, or skills insights directly.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              title="Job Tracker"
              description="Manage applications, statuses, and notes."
              icon={CalendarCheck}
              onClick={() => navigate("/jobs")}
            />
            <QuickActionCard
              title="Schedule"
              description="Review interviews and upcoming follow-ups."
              icon={CalendarCheck}
              onClick={() => navigate("/interviews")}
            />
            <QuickActionCard
              title="Skills Insights"
              description="See the skills showing up across roles."
              icon={Sparkles}
              onClick={() => navigate("/skills-insights")}
            />
            <QuickActionCard
              title="Take the Tour"
              description="Walk through the app with guided callouts."
              icon={Sparkles}
              onClick={startTour}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileCompletenessBanner({ score, onAction }: { score: number; onAction: () => void }) {
  const pct = (score / 5) * 100;
  const isEarly = score < 3;

  const title =
    score === 0
      ? "Set up your search profile"
      : score < 3
        ? `Your profile is ${score} of 5 complete`
        : `Sharpen your profile (${score} of 5)`;

  const description =
    score === 0
      ? "Add your target roles, preferred locations, skills, and salary floor so the product can tailor search and writing assistance."
      : score < 3
        ? "A fuller profile improves your search suggestions, job summaries, and generated materials."
        : "Just a couple more fields will noticeably improve the quality of matches and AI suggestions.";

  return (
    <section
      className={`rounded-[1.75rem] border p-5 shadow-sm sm:p-6 ${
        isEarly ? "border-warning/45 bg-warning/10" : "border-info/35 bg-info/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isEarly ? "bg-warning/20 text-warning-foreground" : "bg-info/15 text-info"
          }`}
        >
          <UserCog className="h-5 w-5" />
        </div>

        <div className="min-w-[240px] flex-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-3 max-w-md">
            <Progress value={pct} className="h-2" />
          </div>
        </div>

        <Button onClick={onAction} className="gap-2">
          Complete profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

function EntryPrototypeCard({ path, onClick }: { path: EntryPath; onClick: () => void }) {
  const toneClasses: Record<EntryPath["tone"], string> = {
    neutral: "border-border bg-card",
    info: "border-info/25 bg-info/5",
    success: "border-success/25 bg-success/5",
    warning: "border-warning/35 bg-warning/10",
  };

  const iconClasses: Record<EntryPath["tone"], string> = {
    neutral: "border-border bg-muted text-foreground",
    info: "border-info/25 bg-info/10 text-info",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/35 bg-warning/15 text-warning-foreground",
  };

  const numberClasses: Record<EntryPath["tone"], string> = {
    neutral: "text-muted-foreground/35",
    info: "text-info/25",
    success: "text-success/25",
    warning: "text-warning-foreground/25",
  };

  const Icon = path.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[1.75rem] border p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-7 ${toneClasses[path.tone]}`}
    >
      <div className="absolute right-5 top-4 font-serif text-[3rem] font-bold leading-none tracking-tight sm:text-[4rem] ${numberClasses[path.tone]}" />
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${iconClasses[path.tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={`font-serif text-[3rem] font-bold leading-none tracking-tight sm:text-[4rem] ${numberClasses[path.tone]}`}>
          {path.number}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {path.persona}
        </div>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
          {path.title}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{path.description}</p>
      </div>

      <ul className="mt-5 space-y-2">
        {path.steps.map((step) => (
          <li key={step} className="flex items-center gap-2 text-sm text-foreground/85">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {step}
          </li>
        ))}
      </ul>

      {path.note && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <span>{path.note}</span>
        </div>
      )}

      {path.featured && (
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-foreground">
          Recommended first move
        </div>
      )}

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors group-hover:text-accent-foreground">
        {path.cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </button>
  );
}
