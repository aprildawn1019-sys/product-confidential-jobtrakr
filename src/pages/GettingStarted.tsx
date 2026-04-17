import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Check,
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
  const [profileFields, setProfileFields] = useState<{ label: string; filled: boolean }[]>([]);

  const startTour = () => window.dispatchEvent(new Event("jobtrakr:start-tour"));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const emptyFields = [
        { label: "Target roles", filled: false },
        { label: "Locations", filled: false },
        { label: "Skills", filled: false },
        { label: "Summary", filled: false },
        { label: "Salary floor", filled: false },
      ];

      if (!user) {
        if (!cancelled) {
          setProfileScore(0);
          setProfileFields(emptyFields);
        }
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
        setProfileFields(emptyFields);
        return;
      }

      const fields = [
        { label: "Target roles", filled: !!data.target_roles?.length },
        { label: "Locations", filled: !!data.locations?.length },
        { label: "Skills", filled: !!data.skills?.length },
        { label: "Summary", filled: !!data.summary?.trim() },
        { label: "Salary floor", filled: !!(data.min_base_salary && data.min_base_salary > 0) },
      ];

      setProfileFields(fields);
      setProfileScore(fields.filter((f) => f.filled).length);
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
        tourId: "entry-profile",
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
        tourId: "entry-job-search",
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
        tourId: "entry-network",
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
        tourId: "entry-target-companies",
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

      {profileScore !== null && profileScore < 5 && (
        <ProfileCompletenessBanner
          score={profileScore}
          fields={profileFields}
          onAction={() => navigate("/profile")}
        />
      )}

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

function ProfileCompletenessBanner({
  score,
  fields,
  onAction,
}: {
  score: number;
  fields: { label: string; filled: boolean }[];
  onAction: () => void;
}) {
  const pct = Math.round((score / 5) * 100);

  const title =
    score === 0
      ? "Set up your search profile"
      : score < 3
        ? "Your profile needs a few more details"
        : "Sharpen your profile";

  const description =
    score === 0
      ? "Add your target roles, preferred locations, skills, summary, and salary floor so the product can tailor search and writing assistance."
      : score < 3
        ? "A fuller profile improves search suggestions, job summaries, and generated materials. Each field below adds 20%."
        : "Just a couple more fields will noticeably improve match quality and AI suggestions. Each field adds 20%.";

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <section className="rounded-[1.75rem] border border-l-4 border-warning/40 border-l-accent bg-gradient-to-br from-warning/15 via-card to-warning/5 p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/15 text-accent-foreground">
          <UserCog className="h-6 w-6" />
        </div>

        <div className="min-w-[260px] flex-1">
          {/* Hero: percentage + title */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-4xl font-bold text-accent-foreground">{pct}%</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                complete
              </span>
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold text-foreground">{title}</div>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Custom progress bar */}
          <div className="mt-5 max-w-xl">
            <div className="relative h-3 w-full overflow-visible rounded-full bg-primary/10">
              {/* Filled portion */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
              {/* Segment dividers (4 internal dividers between 5 segments) */}
              {[20, 40, 60, 80].map((pos) => (
                <div
                  key={pos}
                  className="absolute top-0 h-full w-px bg-card"
                  style={{ left: `${pos}%` }}
                />
              ))}
              {/* Floating % badge above filled edge */}
              {pct > 0 && (
                <div
                  className="absolute -top-7 -translate-x-1/2 rounded-md border border-accent/40 bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm"
                  style={{ left: `${pct}%` }}
                >
                  {pct}%
                </div>
              )}
            </div>
            {/* Tick labels */}
            <div className="relative mt-1.5 h-4 w-full">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute -translate-x-1/2 text-[10px] font-medium text-muted-foreground"
                  style={{ left: `${t}%` }}
                >
                  {t}%
                </span>
              ))}
            </div>
          </div>

          {/* Field checklist */}
          <div className="mt-5 flex flex-wrap gap-2">
            {fields.map((f) => (
              <div
                key={f.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  f.filled
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {f.filled ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                )}
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={onAction}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
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
      data-tour={path.tourId}
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
