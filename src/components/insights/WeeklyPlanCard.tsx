import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Minus, Send, Users, CalendarCheck, Loader2, AlertCircle, Target,
  MessageCircle, ClipboardList, Compass, Pin, PinOff, Info,
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
  strategy: Sparkles,
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
              <Sparkles className="h-4 w-4 text-accent" />
              Weekly Plan
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
      <CardContent className="space-y-5">
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

        {/* Scoreboard */}
        {scoreboard && (
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
        )}

        {/* AI Plan */}
        {scoreboard && plan.length > 0 && (
          <div className="rounded-lg border border-border bg-gradient-to-b from-muted/20 to-transparent p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Recommended for next week
            </div>
            <ol className="space-y-2.5">
              {plan.map((action, idx) => {
                const Icon = CATEGORY_ICON[action.category || "strategy"] || Sparkles;
                return (
                  <li
                    key={action.id}
                    className="flex items-start gap-3 rounded-md border border-border/60 bg-card p-3 animate-fade-in"
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
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
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
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
