import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, CalendarCheck, Send, Star, Sparkles, Inbox, Columns3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import StatCard from "@/components/StatCard";
import ActionQueue from "@/components/commandcenter/ActionQueue";
import ActionSwimlane from "@/components/commandcenter/ActionSwimlane";
import WeeklyReview from "@/components/dashboard/WeeklyReview";
import UpcomingInterviewsStrip from "@/components/dashboard/UpcomingInterviewsStrip";
import ActiveOpportunitiesPanel from "@/components/dashboard/ActiveOpportunitiesPanel";
import TargetCoverageSnapshot from "@/components/dashboard/TargetCoverageSnapshot";
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

type ViewMode = "queue" | "swimlane";

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
  const [viewMode, setViewMode] = useState<ViewMode>("queue");

  const { snoozes, snooze } = useActionSnoozes();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {actions.length === 0
              ? "Nothing on your plate. Plan your next move."
              : `${actions.length} next step${actions.length === 1 ? "" : "s"}${overdueCount ? ` · ${overdueCount} overdue` : ""}${todayCount ? ` · ${todayCount} today` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fetchAi({ jobs, contacts, targetCompanies, recommendationRequests })}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Suggest next steps
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.dispatchEvent(new Event("jobtrakr:start-tour"))}
          >
            <Sparkles className="h-4 w-4" /> Take the tour
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={jobs.length} icon={Briefcase} href="/jobs" />
        <StatCard label="Active Applications" value={activeApps} icon={Send} accent="info" href="/jobs?status=active" />
        <StatCard label="Interviews Scheduled" value={upcoming.length} icon={CalendarCheck} accent="warning" href="/interviews" />
        <StatCard label="Target Companies" value={targetCompanies.filter(tc => tc.status !== "archived").length} icon={Star} accent="success" href="/target-companies" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Next steps</h2>
            <p className="text-xs text-muted-foreground">
              Across networking, referrals, and applications · sorted by urgency
            </p>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="h-8 rounded-md border border-border bg-card"
          >
            <ToggleGroupItem value="queue" className="h-7 px-2 text-xs gap-1" title="Single prioritized list">
              <Inbox className="h-3 w-3" /> Queue
            </ToggleGroupItem>
            <ToggleGroupItem value="swimlane" className="h-7 px-2 text-xs gap-1" title="Three-lane bird's-eye view">
              <Columns3 className="h-3 w-3" /> Swimlane
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {viewMode === "queue" ? (
          <ActionQueue actions={actions} onSnooze={snooze} />
        ) : (
          <ActionSwimlane actions={actions} onSnooze={snooze} />
        )}
      </div>

    </div>
  );
}
