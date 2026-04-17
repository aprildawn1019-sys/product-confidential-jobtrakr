import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Star,
  Briefcase,
  CalendarCheck,
  Trophy,
  ArrowRight,
  Sparkles,
  Network,
  ClipboardList,
  Send,
  RefreshCw,
  Check,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Job, Contact, TargetCompany, Interview } from "@/types/jobTracker";

interface GettingStartedProps {
  jobs?: Job[];
  contacts?: Contact[];
  targetCompanies?: TargetCompany[];
  interviews?: Interview[];
  coverLetterCount?: number;
}

/**
 * Getting Started — visual map of the (non-linear) Jobtrakr workflow.
 * Three entry points converge into the unified application pipeline.
 */
export default function GettingStarted({
  jobs = [],
  contacts = [],
  targetCompanies = [],
  interviews = [],
}: GettingStartedProps) {
  const navigate = useNavigate();

  const startTour = () => window.dispatchEvent(new Event("jobtrakr:start-tour"));

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
    <div className="space-y-10 animate-fade-in max-w-6xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3 gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Getting Started
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight">Three ways to start your job search</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Jobtrakr isn't linear. Pick the entry point that matches how you're approaching your search today —
            every path converges into the same unified pipeline.
          </p>
        </div>
        <Button onClick={startTour} className="gap-2">
          <Sparkles className="h-4 w-4" /> Take the interactive tour
        </Button>
      </header>

      {/* Entry points */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Choose your entry point</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <EntryCard
            number={1}
            icon={Search}
            title="Search for jobs"
            description="Already know the role you want? Start with AI-powered search, browse curated job boards, or bulk-import a list of openings."
            steps={["AI Job Search", "Job Boards", "Bulk Import"]}
            cta="Open AI Job Search"
            onClick={() => navigate("/job-search")}
            accent="info"
          />
          <EntryCard
            number={2}
            icon={Users}
            title="Network first"
            description="Prefer relationship-driven searches? Add contacts, log conversations, and let opportunities surface from your network."
            steps={["Add Contacts", "Log Activity & Warmth", "Network Map"]}
            cta="Open Connections"
            onClick={() => navigate("/contacts")}
            accent="success"
          />
          <EntryCard
            number={3}
            icon={Star}
            title="Start with target companies"
            description="Have a dream-employer shortlist? Add them, set priorities, then discover roles and contacts within each company."
            steps={["Add Companies", "Set Priority", "Find Jobs & Contacts"]}
            cta="Open Target Companies"
            onClick={() => navigate("/target-companies")}
            accent="warning"
          />
        </div>
      </section>

      {/* Progress checklist */}
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

      {/* Convergence flow */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">All paths converge</h2>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FlowStep icon={Briefcase} label="Add to Tracker" onClick={() => navigate("/jobs")} />
            <FlowArrow />
            <FlowStep icon={ClipboardList} label="Job CRM" sub="Link contacts · score · prioritize" onClick={() => navigate("/jobs")} />
            <FlowArrow />
            <FlowStep icon={Send} label="Apply" sub="Cover letter · resume" onClick={() => navigate("/cover-letters")} />
            <FlowArrow />
            <FlowStep icon={CalendarCheck} label="Interview" onClick={() => navigate("/interviews")} />
            <FlowArrow />
            <FlowStep icon={Trophy} label="Offer" highlight />
          </div>

          {/* Pipeline stages */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Pipeline stages</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {["Saved", "Applied", "Screening", "Interviewing", "Offer"].map((stage, i, arr) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-secondary px-3 py-1 font-medium text-secondary-foreground">
                    {stage}
                  </span>
                  {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cross-links — non-linear loops */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Built for non-linear searches</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <CrossLink
            icon={Network}
            from="Network Map"
            to="Target Companies"
            description="Spot recurring employers in your network and add them to your shortlist."
          />
          <CrossLink
            icon={Star}
            from="Target Companies"
            to="AI Job Search"
            description="Filter searches by your target list to surface relevant openings first."
          />
          <CrossLink
            icon={ClipboardList}
            from="Job CRM"
            to="Connections"
            description="A new role prompts you to find or add the right contact at that company."
          />
          <CrossLink
            icon={RefreshCw}
            from="Rejected"
            to="Any entry point"
            description="A 'no' isn't the end — loop back through search, network, or targets to keep momentum."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 sm:p-8 text-center">
        <h3 className="font-display text-xl font-bold tracking-tight">Ready to dive in?</h3>
        <p className="mt-2 text-muted-foreground">Pick a starting point, or let us walk you through it.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/job-search")}>Search jobs</Button>
          <Button variant="outline" onClick={() => navigate("/contacts")}>Add a contact</Button>
          <Button variant="outline" onClick={() => navigate("/target-companies")}>Add a company</Button>
          <Button onClick={startTour} className="gap-2">
            <Sparkles className="h-4 w-4" /> Take the tour
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

interface EntryCardProps {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  steps: string[];
  cta: string;
  onClick: () => void;
  accent: "info" | "success" | "warning";
}

function EntryCard({ number, icon: Icon, title, description, steps, cta, onClick, accent }: EntryCardProps) {
  const accentClasses: Record<string, string> = {
    info: "bg-info/10 text-info border-info/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-display text-3xl font-bold text-muted-foreground/30">0{number}</span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
      <ul className="mt-4 space-y-1.5">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-2 text-sm text-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            {step}
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="mt-5 -mx-2 justify-between group-hover:bg-secondary" onClick={onClick}>
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  );
}

function FlowStep({
  icon: Icon,
  label,
  sub,
  onClick,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const base = "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors min-w-0";
  const styles = highlight
    ? "border-accent/50 bg-accent/15 text-accent-foreground"
    : "border-border bg-background hover:border-primary/40 hover:bg-secondary cursor-pointer";

  const Wrapper: React.ElementType = onClick ? "button" : "div";
  return (
    <Wrapper className={`${base} ${styles}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <Icon className={`h-5 w-5 ${highlight ? "text-accent-foreground" : "text-primary"}`} />
      <div className="font-semibold text-sm leading-tight">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground leading-tight">{sub}</div>}
    </Wrapper>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground shrink-0">
      <ArrowRight className="h-4 w-4 hidden sm:block" />
      <ArrowRight className="h-4 w-4 rotate-90 sm:hidden" />
    </div>
  );
}

function CrossLink({
  icon: Icon,
  from,
  to,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  from: string;
  to: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <span>{from}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{to}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
