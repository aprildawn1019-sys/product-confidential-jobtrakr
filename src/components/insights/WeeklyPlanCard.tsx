import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Minus, Send, Users, CalendarCheck, Loader2, AlertCircle, Target,
  MessageCircle, ClipboardList, Compass, Pin, PinOff, Info, Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CelebrationBurst } from "@/components/insights/CelebrationBurst";
import { usePinnedPlanActions } from "@/hooks/usePinnedPlanActions";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface ScoreboardMetric { current: number; previous: number; delta: number }
interface Scoreboard {
  applications: ScoreboardMetric;
  outreach: ScoreboardMetric;
  interviews: ScoreboardMetric;
  weekStart: string;
  weeklyHistory: { week: string; applications: number; interviews: number; outreach: number }[];
}
interface PlanAction {
  id: string;
  title: string;
  rationale?: string;
  category?: string;
}

const CATEGORY_ICON: Record<string, typeof Target> = {
  outreach: MessageCircle,
  applications: ClipboardList,
  "follow-up": Compass,
  preparation: Target,
  strategy: Lightbulb,
};

const CATEGORY_LABEL: Record<string, string> = {
  outreach: "Outreach",
  applications: "Apply",
  "follow-up": "Follow-up",
  preparation: "Prep",
  strategy: "Strategy",
};

interface ScoreTileProps {
  label: string;
  icon: typeof Send;
  metric: ScoreboardMetric;
  accent: string;
  celebrate: boolean;
}

function ScoreTile({ label, icon: Icon, metric, accent, celebrate }: ScoreTileProps) {
  const isUp = metric.delta > 0;
  const isDown = metric.delta < 0;
  const isFlat = metric.delta === 0;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp ? "text-success" : isDown ? "text-muted-foreground" : "text-muted-foreground";
  const deltaText = isFlat ? "0" : `${isUp ? "+" : ""}${metric.delta}`;

  return (
    <div className="relative rounded-lg border border-border bg-card p-4 overflow-visible">
      <CelebrationBurst trigger={celebrate ? metric.current : 0} color={`hsl(var(--${accent}))`} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
          <Icon className={cn("h-3.5 w-3.5", `text-${accent}`)} />
          {label}
        </div>
        <div className={cn("flex items-center gap-0.5 text-[11px] font-medium tabular-nums", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {deltaText}
        </div>
      </div>
      <div className="font-display text-3xl font-bold tabular-nums leading-none text-foreground">
        {metric.current}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        vs. {metric.previous} last week
      </div>
    </div>
  );
}

export function WeeklyPlanCard() {
  const [loading, setLoading] = useState(false);
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [plan, setPlan] = useState<PlanAction[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [didInitialFetch, setDidInitialFetch] = useState(false);
  const { isPinned, toggle: togglePin } = usePinnedPlanActions();

  const fetchPlan = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("generate-weekly-plan", {
        body: { force },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setScoreboard(data.scoreboard);
      setPlan(data.plan || []);
      setGeneratedAt(data.generatedAt || null);

      // Trigger celebration on any positive delta
      const sb: Scoreboard = data.scoreboard;
      const anyPositive = sb && (sb.applications.delta > 0 || sb.outreach.delta > 0 || sb.interviews.delta > 0);
      if (anyPositive) {
        setCelebrationKey((k) => k + 1);
      }

      if (force) {
        toast({ title: "Plan refreshed", description: `${data.plan?.length ?? 0} actions for this week.` });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate plan";
      setError(msg);
      if (force) {
        toast({ title: "Plan generation failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch the cached plan on mount (cheap; just a DB lookup if cached)
  useEffect(() => {
    if (didInitialFetch) return;
    setDidInitialFetch(true);
    fetchPlan(false);
  }, [didInitialFetch, fetchPlan]);

  const generatedLabel = useMemo(() => {
    if (!generatedAt) return null;
    try {
      return formatDistanceToNow(parseISO(generatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [generatedAt]);

  const weekLabel = useMemo(() => {
    if (!scoreboard?.weekStart) return "this week";
    try {
      return `Week of ${format(parseISO(scoreboard.weekStart), "MMM d")}`;
    } catch {
      return "this week";
    }
  }, [scoreboard]);

  const chartData = useMemo(() => {
    if (!scoreboard?.weeklyHistory) return [];
    return scoreboard.weeklyHistory.map((w) => ({
      ...w,
      week: (() => { try { return format(parseISO(w.week), "MMM d"); } catch { return w.week; } })(),
    }));
  }, [scoreboard]);

  // Derived: should each tile celebrate?
  const celebrate = celebrationKey > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Weekly Review &amp; Plan
            </CardTitle>
            <CardDescription className="text-xs">
              {weekLabel} — your scoreboard and AI-recommended next moves.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {generatedLabel && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Updated {generatedLabel}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => fetchPlan(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading skeleton on first load */}
        {loading && !scoreboard && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Generating your weekly plan…
          </div>
        )}

        {/* Error state */}
        {error && !scoreboard && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Couldn't generate plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ============ SECTION 1: This Week's Scoreboard ============ */}
        {scoreboard && (
          <section aria-labelledby="weekly-scoreboard-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3
                id="weekly-scoreboard-heading"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                This week's scoreboard
              </h3>
              <span className="text-[11px] text-muted-foreground">vs. previous 7 days</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ScoreTile
                label="Applications"
                icon={Send}
                metric={scoreboard.applications}
                accent="primary"
                celebrate={celebrate && scoreboard.applications.delta > 0}
              />
              <ScoreTile
                label="Outreach"
                icon={Users}
                metric={scoreboard.outreach}
                accent="info"
                celebrate={celebrate && scoreboard.outreach.delta > 0}
              />
              <ScoreTile
                label="Interviews"
                icon={CalendarCheck}
                metric={scoreboard.interviews}
                accent="success"
                celebrate={celebrate && scoreboard.interviews.delta > 0}
              />
            </div>
          </section>
        )}

        {/* Visual divider between Review and Plan */}
        {scoreboard && plan.length > 0 && (
          <div className="relative" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Looking ahead
              </span>
            </div>
          </div>
        )}

        {/* ============ SECTION 2: Plan for Next Week ============ */}
        {scoreboard && plan.length > 0 && (
          <section
            aria-labelledby="weekly-plan-heading"
            className="rounded-lg border border-accent/30 bg-accent/[0.03] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3
                  id="weekly-plan-heading"
                  className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Plan for next week
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  AI-generated from your last 4 weeks of activity. Pin any item to add it to your Command Center.
                </p>
              </div>
            </div>
            <ol className="space-y-2.5">
              {plan.map((action, idx) => {
                const Icon = CATEGORY_ICON[action.category || "strategy"] || Lightbulb;
                const pinned = isPinned(action.id);
                return (
                  <li
                    key={action.id}
                    className="group flex items-start gap-3 rounded-md border border-border/60 bg-card p-3 animate-fade-in transition-colors hover:border-border"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {action.title}
                        </p>
                        {action.category && (
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0 capitalize">
                            {CATEGORY_LABEL[action.category] || action.category}
                          </Badge>
                        )}
                      </div>
                      {action.rationale && (
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {action.rationale}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={pinned ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                  "h-6 px-2 text-[11px] gap-1",
                                  pinned ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => {
                                  togglePin({
                                    id: action.id,
                                    title: action.title,
                                    rationale: action.rationale,
                                    category: action.category,
                                  });
                                  toast({
                                    title: pinned ? "Removed from Command Center" : "Added to Command Center",
                                    description: pinned
                                      ? undefined
                                      : "Find it in your Next Steps list.",
                                  });
                                }}
                              >
                                {pinned ? (
                                  <>
                                    <PinOff className="h-3 w-3" />
                                    Pinned
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-3 w-3" />
                                    Add to Command Center
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {pinned
                                ? "Remove from your Next Steps list"
                                : "Pin this action to your Command Center"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Collapsible 8-week trend */}
        {scoreboard && chartData.length > 0 && (
          <Collapsible open={chartOpen} onOpenChange={setChartOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-full justify-between text-xs text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  View 8-week trend
                </span>
                {chartOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="h-[240px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="interviews" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="outreach" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Applications</span> counts jobs whose status moved to <em>applied</em> that week.{" "}
                  <span className="font-medium text-foreground">Outreach</span> counts contact activities (messages, calls, meetings) logged that week.{" "}
                  <span className="font-medium text-foreground">Interviews</span> counts interviews dated that week, regardless of status. Weeks start Monday in your local timezone.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
