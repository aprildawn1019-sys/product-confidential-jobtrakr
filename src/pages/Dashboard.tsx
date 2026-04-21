import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import NextStepsList from "@/components/commandcenter/NextStepsList";
import WeeklyReview from "@/components/dashboard/WeeklyReview";
import UpcomingInterviewsStrip from "@/components/dashboard/UpcomingInterviewsStrip";
import ActiveOpportunitiesPanel from "@/components/dashboard/ActiveOpportunitiesPanel";

import TargetsNeedingSourcing from "@/components/dashboard/TargetsNeedingSourcing";
import { deriveActions } from "@/lib/actionEngine";
import {
  countActiveJobs,
  countScheduledInterviews,
  countActiveTargetCompanies,
} from "@/lib/pipelineCounts";
import { useActionSnoozes } from "@/hooks/useActionSnoozes";
import { useAiSuggestedActions } from "@/hooks/useAiSuggestedActions";
import type {
  Job,
  Contact,
  Interview,
  JobContact,
  TargetCompany,
  ContactActivity,
  RecommendationRequest,
} from "@/types/jobTracker";

interface DashboardProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  jobContacts: JobContact[];
  targetCompanies?: TargetCompany[];
  contactActivities?: ContactActivity[];
  recommendationRequests?: RecommendationRequest[];
  onUpdateStatus?: (id: string, status: string) => void;
  onUpdateJob?: (id: string, updates: Partial<Job>) => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void;
}

export default function Dashboard({
  jobs,
  contacts,
  interviews,
  jobContacts,
  targetCompanies = [],
  contactActivities = [],
  recommendationRequests = [],
}: DashboardProps) {
  const navigate = useNavigate();
  const [showAllSteps, setShowAllSteps] = useState(false);

  const { snoozes, completed, snooze, complete } = useActionSnoozes();
  const { suggestions: aiSuggestions, loading: aiLoading, fetchSuggestions: fetchAi } = useAiSuggestedActions();

  // First-login redirect: brand-new users → Getting Started.
  useEffect(() => {
    const isEmpty = jobs.length === 0 && contacts.length === 0 && targetCompanies.length === 0;
    const REDIRECT_KEY = "jobtrakr.gettingStarted.redirected";
    if (isEmpty && !sessionStorage.getItem(REDIRECT_KEY)) {
      sessionStorage.setItem(REDIRECT_KEY, "true");
      navigate("/getting-started", { replace: true });
    }
  }, [jobs.length, contacts.length, targetCompanies.length, navigate]);

  // Standardized in-flight counts (single source of truth: src/lib/pipelineCounts.ts).
  // Stat cards, page subtitles, and panel headers all read from these helpers.
  const activeApps = countActiveJobs(jobs);
  const upcomingInterviewCount = countScheduledInterviews(interviews);
  const activeTargetCount = countActiveTargetCompanies(targetCompanies);
  const upcoming = interviews.filter(i => i.status === "scheduled");

  const actions = useMemo(() => deriveActions({
    jobs, contacts, interviews, contactActivities, recommendationRequests,
    targetCompanies, jobContacts, snoozes, aiSuggestions,
  }), [jobs, contacts, interviews, contactActivities, recommendationRequests, targetCompanies, jobContacts, snoozes, aiSuggestions]);

  const overdueCount = actions.filter(a => a.urgency === "overdue").length;
  const todayCount = actions.filter(a => a.urgency === "today").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header — clean title + actions count subtitle. No buttons in the header
          (per dashboard-mockup.jpg / spec-command-center-v2.jpg). */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Command Center</h1>
        <p className="mt-1 text-muted-foreground">
          {actions.length === 0
            ? "Nothing on your plate. Plan your next move."
            : `${actions.length} next step${actions.length === 1 ? "" : "s"}${overdueCount ? ` · ${overdueCount} overdue` : ""}${todayCount ? ` · ${todayCount} today` : ""}`}
        </p>
      </div>

      {/* Primary stats — toggleable between current pipeline ("In flight")
          and all-time totals ("Lifetime"). The three slots stay in place so
          numbers are directly comparable; the toggle just swaps values + the
          helper line that defines what each count includes. Choice persists
          in localStorage so power users get the view they prefer on reload. */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {statsView === "in-flight" ? "In flight" : "Lifetime"}
          </p>
          <div
            role="tablist"
            aria-label="Toggle between in-flight and lifetime totals"
            className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5 text-xs"
          >
            {(["in-flight", "lifetime"] as const).map((view) => (
              <button
                key={view}
                role="tab"
                aria-selected={statsView === view}
                onClick={() => setStatsView(view)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  statsView === view
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view === "in-flight" ? "In flight" : "Lifetime"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={statsView === "in-flight" ? "Active Applications" : "Lifetime Applications"}
            value={statsView === "in-flight" ? activeApps : jobs.length}
            href={statsView === "in-flight" ? "/jobs?status=active" : "/jobs"}
            helper={
              statsView === "in-flight"
                ? "Applied, screening, interviewing, or offer. Excludes saved, rejected, withdrawn, closed."
                : "Every job ever added — including saved, rejected, withdrawn, and closed."
            }
          />
          <StatCard
            label={statsView === "in-flight" ? "Interviews Scheduled" : "Lifetime Interviews"}
            value={statsView === "in-flight" ? upcomingInterviewCount : interviews.length}
            href="/interviews"
            helper={
              statsView === "in-flight"
                ? "Upcoming interviews with status “scheduled.” Excludes completed, cancelled, no-show."
                : "Every interview ever logged — including completed, cancelled, and no-shows."
            }
          />
          <StatCard
            label={statsView === "in-flight" ? "Target Companies" : "Lifetime Targets"}
            value={statsView === "in-flight" ? activeTargetCount : targetCompanies.length}
            href="/target-companies"
            helper={
              statsView === "in-flight"
                ? "Companies on your shortlist. Excludes archived."
                : "Every target company ever added — including archived."
            }
          />
        </div>
      </div>

      {/* Next steps — promoted directly under stats. Hero spec: panel header
          is a single "Next steps" title; no subtitle, no buttons inside the
          card. The Suggest button moves to a quiet ghost row beneath the list. */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold mb-4">Next steps</h2>
        <NextStepsList
          actions={actions}
          completed={completed}
          onComplete={complete}
          onSnooze={snooze}
          visibleCount={showAllSteps ? actions.length : 6}
          onViewAll={() => setShowAllSteps(true)}
        />
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => fetchAi({ jobs, contacts, targetCompanies, recommendationRequests })}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Suggest next steps
          </Button>
        </div>
      </div>

      {/* Secondary: weekly review + upcoming interviews, two-column */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyReview jobs={jobs} interviews={interviews} contactActivities={contactActivities} />
        <UpcomingInterviewsStrip interviews={interviews} jobs={jobs} />
      </div>

      {/* Tertiary: pipeline & sourcing signals — visible by default. The hero
          mockup shows the dashboard scrolling into deeper context after the
          fold; hiding everything in <details> made the dashboard feel empty. */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Pipeline & sourcing signals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active opportunities and sourcing gaps to close
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ActiveOpportunitiesPanel jobs={jobs} />
          <TargetsNeedingSourcing targetCompanies={targetCompanies} contacts={contacts} />
        </div>
      </section>

    </div>
  );
}
