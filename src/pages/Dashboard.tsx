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

  const activeApps = jobs.filter(j => !["saved", "rejected", "withdrawn", "closed"].includes(j.status)).length;
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={jobs.length} href="/jobs" />
        <StatCard label="Active Applications" value={activeApps} href="/jobs?status=active" />
        <StatCard label="Interviews Scheduled" value={upcoming.length} href="/interviews" />
        <StatCard label="Target Companies" value={targetCompanies.filter(tc => tc.status !== "archived").length} href="/target-companies" />
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
