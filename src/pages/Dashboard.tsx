import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import NextStepsList from "@/components/commandcenter/NextStepsList";
// Weekly Review removed from Command Center — Reports page owns weekly recap.
import UpcomingInterviewsStrip from "@/components/dashboard/UpcomingInterviewsStrip";
import ActiveOpportunitiesPanel from "@/components/dashboard/ActiveOpportunitiesPanel";
import QuickLogInterview from "@/components/dashboard/QuickLogInterview";

import TargetsNeedingSourcing from "@/components/dashboard/TargetsNeedingSourcing";
import { deriveActions } from "@/lib/actionEngine";
import {
  countActiveJobs,
  countSavedJobs,
  countScheduledInterviews,
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
  onAddJob?: (job: Omit<Job, "id" | "createdAt">) => Promise<Job | undefined> | Job | void;
  onAddInterview?: (interview: Omit<Interview, "id">) => Promise<void> | void;
}

export default function Dashboard({
  jobs,
  contacts,
  interviews,
  jobContacts,
  targetCompanies = [],
  contactActivities = [],
  recommendationRequests = [],
  onAddJob,
  onAddInterview,
}: DashboardProps) {
  const navigate = useNavigate();

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
  const savedJobsCount = countSavedJobs(jobs);
  const activeApps = countActiveJobs(jobs);
  const upcomingInterviewCount = countScheduledInterviews(interviews);

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

      {/* Primary stats — in-flight pipeline only. Three slots reflect distinct
          stages of activity on the Command Center: jobs you're considering
          (saved), jobs you're actively pursuing (applications in motion), and
          interviews on the calendar. Lifetime totals and Target Companies live
          on their dedicated pages — they aren't activity signals. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          In flight
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Jobs"
            value={savedJobsCount}
            href="/jobs?status=saved"
            helper="Saved roles awaiting application — your shortlist of opportunities to act on."
          />
          <StatCard
            label="Active Applications"
            value={activeApps}
            href="/jobs?status=active"
            helper="Applied, screening, interviewing, or offer. Excludes saved, rejected, withdrawn, closed."
          />
          <StatCard
            label="Interviews Scheduled"
            value={upcomingInterviewCount}
            href="/interviews"
            helper="Upcoming interviews with status “scheduled.” Excludes completed, cancelled, no-show."
          />
        </div>
      </div>

      {/* Next steps — promoted from card to focal area. No bordered shell;
          the section is the visual anchor. Filter chips + cohort grouping
          live inside NextStepsList; AI suggest is an inline list row. */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Next steps</h2>
          {actions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {`${overdueCount ? `${overdueCount} overdue · ` : ""}${todayCount ? `${todayCount} today · ` : ""}${Math.max(0, actions.length - overdueCount - todayCount)} later`}
            </p>
          )}
        </div>
        <NextStepsList
          actions={actions}
          completed={completed}
          onComplete={complete}
          onSnooze={snooze}
          onRequestAi={() => fetchAi({ jobs, contacts, targetCompanies, recommendationRequests })}
          aiLoading={aiLoading}
        />
      </section>

      {/* Secondary: interview log + upcoming interviews. The quick-log card
          sits next to Upcoming so the "I just had a screen" workflow is a
          single glance away from the calendar. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {onAddJob && onAddInterview && (
          <QuickLogInterview jobs={jobs} onAddJob={onAddJob} onAddInterview={onAddInterview} />
        )}
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
