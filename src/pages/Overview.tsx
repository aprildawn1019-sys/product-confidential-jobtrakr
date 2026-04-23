import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowLeft, GitBranch, LineChart as LineIcon, Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type {
  Job, Contact, Interview, ContactActivity, JobContact, RecommendationRequest,
} from "@/types/jobTracker";
import { differenceInCalendarDays, parseISO, startOfWeek, format } from "date-fns";
import { parseLocalDate } from "@/lib/localDate";

interface OverviewProps {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  contactActivities: ContactActivity[];
  jobContacts: JobContact[];
  recommendationRequests: RecommendationRequest[];
}

/**
 * Three lanes of effort. All applications fall into exactly one.
 *  - referral: ≥1 linked contact AND ≥1 contact_activity for that contact dated ON OR BEFORE applied_date
 *  - warm:     ≥1 linked contact, but no qualifying pre-apply activity
 *  - cold:     0 linked contacts
 */
type Lane = "cold" | "warm" | "referral";

const LANE_LABEL: Record<Lane, string> = {
  cold: "Cold",
  warm: "Warm",
  referral: "Referral",
};

const LANE_DOT: Record<Lane, string> = {
  cold: "bg-[hsl(var(--text-tertiary))]",
  warm: "bg-[hsl(var(--info))]",
  referral: "bg-[hsl(var(--success))]",
};

const MIN_LANE_N = 5;
type WindowKey = "30d" | "90d" | "all";
const WINDOW_DAYS: Record<WindowKey, number | null> = { "30d": 30, "90d": 90, "all": null };
const WINDOW_LABEL: Record<WindowKey, string> = { "30d": "30 days", "90d": "90 days", "all": "all time" };

function PlaceholderHint({ note }: { note: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2.5">
      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

interface LaneBarProps {
  label: string;
  total: number;
  counts: { cold: number; warm: number; referral: number; total: number };
}

function LaneBar({ label, total, counts }: LaneBarProps) {
  const lanes: Lane[] = ["referral", "warm", "cold"];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="text-xs font-medium text-foreground">
          {label}{" "}
          <span className="text-muted-foreground tabular-nums">
            (n={total})
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {lanes
            .filter(l => counts[l] > 0)
            .map(l => `${LANE_LABEL[l]} ${total > 0 ? Math.round((counts[l] / total) * 100) : 0}%`)
            .join(" · ")}
        </div>
      </div>
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted/50">
        {total === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          lanes.map((lane) => {
            const pct = (counts[lane] / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={lane}
                className={cn(
                  "flex items-center justify-center text-[10px] font-medium text-white tabular-nums",
                  LANE_DOT[lane],
                )}
                style={{ width: `${pct}%` }}
                title={`${LANE_LABEL[lane]}: ${counts[lane]} (${Math.round(pct)}%)`}
              >
                {pct >= 8 ? `${Math.round(pct)}%` : ""}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Overview({
  jobs, contacts, interviews, contactActivities, jobContacts, recommendationRequests,
}: OverviewProps) {
  const navigate = useNavigate();
  const [windowKey, setWindowKey] = useState<WindowKey>("90d");

  // ---------- Pipeline by lane ----------
  // For each applied job in the selected window, classify into cold/warm/referral
  // and compute (a) application mix, (b) interview mix, (c) per-lane conversion.
  const pipelineByLane = useMemo(() => {
    const days = WINDOW_DAYS[windowKey];
    const cutoff = days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;

    // Pre-index for fast lookup.
    const contactsByJob = new Map<string, string[]>();
    for (const jc of jobContacts) {
      const arr = contactsByJob.get(jc.jobId) ?? [];
      arr.push(jc.contactId);
      contactsByJob.set(jc.jobId, arr);
    }
    const activitiesByContact = new Map<string, number[]>();
    for (const a of contactActivities) {
      const d = parseLocalDate(a.activityDate);
      if (!d) continue;
      const arr = activitiesByContact.get(a.contactId) ?? [];
      arr.push(d.getTime());
      activitiesByContact.set(a.contactId, arr);
    }
    // Earliest interview timestamp per job (for both "has interview" presence and median time-to-interview)
    const jobEarliestInterview = new Map<string, number>();
    for (const i of interviews) {
      const d = parseLocalDate(i.date);
      if (!d) continue;
      const t = d.getTime();
      const prev = jobEarliestInterview.get(i.jobId);
      if (prev === undefined || t < prev) jobEarliestInterview.set(i.jobId, t);
    }

    const apps = { cold: 0, warm: 0, referral: 0, total: 0 };
    const ivs = { cold: 0, warm: 0, referral: 0, total: 0 };
    const daysToInterview: number[] = [];

    for (const j of jobs) {
      if (!j.appliedDate) continue;
      const appliedAt = parseLocalDate(j.appliedDate);
      if (!appliedAt) continue;
      if (cutoff !== null && appliedAt.getTime() < cutoff) continue;

      const linkedContacts = contactsByJob.get(j.id) ?? [];
      let lane: Lane;
      if (linkedContacts.length === 0) {
        lane = "cold";
      } else {
        const appliedTs = appliedAt.getTime();
        const hasPreApplyActivity = linkedContacts.some(cid => {
          const acts = activitiesByContact.get(cid);
          return acts?.some(t => t <= appliedTs) ?? false;
        });
        lane = hasPreApplyActivity ? "referral" : "warm";
      }

      apps[lane]++;
      apps.total++;
      const earliest = jobEarliestInterview.get(j.id);
      if (earliest !== undefined) {
        ivs[lane]++;
        ivs.total++;
        const days = Math.max(0, Math.round((earliest - appliedAt.getTime()) / (24 * 60 * 60 * 1000)));
        daysToInterview.push(days);
      }
    }

    const conversion = {
      cold: apps.cold > 0 ? ivs.cold / apps.cold : 0,
      warm: apps.warm > 0 ? ivs.warm / apps.warm : 0,
      referral: apps.referral > 0 ? ivs.referral / apps.referral : 0,
    };

    // Median days to first interview across all lanes in window
    let medianDaysToInterview: number | null = null;
    if (daysToInterview.length > 0) {
      const sorted = [...daysToInterview].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianDaysToInterview = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    }

    return { applications: apps, interviews: ivs, conversion, medianDaysToInterview };
  }, [jobs, jobContacts, contactActivities, interviews, windowKey]);

  // ---------- Time to first interview (PLACEHOLDER) ----------
  // TODO(metric): Replace with the agreed formula once provided.
  // Current stub: per-job days from job.appliedDate to the earliest scheduled interview.date.
  const timeToFirstInterview = useMemo(() => {
    const rows: { jobLabel: string; days: number }[] = [];
    for (const j of jobs) {
      if (!j.appliedDate) continue;
      const jobInterviews = interviews
        .filter(i => i.jobId === j.id)
        .map(i => {
          try { return parseISO(i.date).getTime(); } catch { return NaN; }
        })
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);
      if (jobInterviews.length === 0) continue;
      const applied = parseISO(j.appliedDate);
      if (isNaN(applied.getTime())) continue;
      const days = Math.max(0, differenceInCalendarDays(new Date(jobInterviews[0]), applied));
      rows.push({ jobLabel: `${j.company} · ${j.title}`.slice(0, 30), days });
    }
    rows.sort((a, b) => b.days - a.days);
    return rows.slice(0, 10);
  }, [jobs, interviews]);

  const avgTimeToFirstInterview = useMemo(() => {
    if (timeToFirstInterview.length === 0) return null;
    const sum = timeToFirstInterview.reduce((acc, r) => acc + r.days, 0);
    return Math.round(sum / timeToFirstInterview.length);
  }, [timeToFirstInterview]);

  // ---------- Weekly velocity (PLACEHOLDER) ----------
  // TODO(metric): Replace with the agreed formula once provided.
  // Current stub: applications/week, interviews scheduled/week, contact activities/week, last 8 ISO weeks.
  const velocityData = useMemo(() => {
    const now = new Date();
    const weeks: { iso: string; label: string; start: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const iso = ws.toISOString().slice(0, 10);
      if (!weeks.find(w => w.iso === iso)) {
        weeks.push({ iso, label: format(ws, "MMM d"), start: ws.getTime() });
      }
    }

    const bucket = (ts: number) => {
      // last week index whose start <= ts
      for (let i = weeks.length - 1; i >= 0; i--) {
        if (ts >= weeks[i].start) return i;
      }
      return -1;
    };

    const counts = weeks.map(w => ({ week: w.label, applications: 0, interviews: 0, outreach: 0 }));

    for (const j of jobs) {
      if (!j.appliedDate) continue;
      let t: number;
      try { t = parseISO(j.appliedDate).getTime(); } catch { continue; }
      const idx = bucket(t);
      if (idx >= 0) counts[idx].applications++;
    }
    for (const i of interviews) {
      let t: number;
      try { t = parseISO(i.date).getTime(); } catch { continue; }
      const idx = bucket(t);
      if (idx >= 0) counts[idx].interviews++;
    }
    for (const a of contactActivities) {
      let t: number;
      try { t = parseISO(a.activityDate).getTime(); } catch { continue; }
      const idx = bucket(t);
      if (idx >= 0) counts[idx].outreach++;
    }
    return counts;
  }, [jobs, interviews, contactActivities]);

  const totalSamples = jobs.length + contacts.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 -ml-2 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Command Center
            </Button>
            <Badge variant="outline" className="text-[10px] h-5">Beta</Badge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Search funnel analytics — response rates, time to first interview, and weekly velocity.
          </p>
        </div>
      </div>

      {totalSamples === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Add some jobs and contacts to populate analytics. Charts below are placeholders.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pipeline by lane */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Pipeline by lane
              </CardTitle>
              <CardDescription className="text-xs">
                Where your effort goes vs. where interviews come from.
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              size="sm"
              value={windowKey}
              onValueChange={(v) => v && setWindowKey(v as WindowKey)}
              className="h-8"
            >
              <ToggleGroupItem value="30d" className="h-7 px-2.5 text-xs">30d</ToggleGroupItem>
              <ToggleGroupItem value="90d" className="h-7 px-2.5 text-xs">90d</ToggleGroupItem>
              <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">All time</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {pipelineByLane.applications.total === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No applications in the last {WINDOW_LABEL[windowKey]}.{" "}
              {windowKey !== "all" && (
                <button
                  type="button"
                  onClick={() => setWindowKey("all")}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Switch to All time
                </button>
              )}
              {windowKey !== "all" && " or log an apply date on tracked jobs."}
            </div>
          ) : (
            <>
              {/* Stacked bars: applications + interviews */}
              <div className="space-y-3">
                <LaneBar
                  label="Applications"
                  total={pipelineByLane.applications.total}
                  counts={pipelineByLane.applications}
                />
                <LaneBar
                  label="Interviews"
                  total={pipelineByLane.interviews.total}
                  counts={pipelineByLane.interviews}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                {(["referral", "warm", "cold"] as Lane[]).map((lane) => (
                  <div key={lane} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-sm", LANE_DOT[lane])} />
                    <span>{LANE_LABEL[lane]}</span>
                  </div>
                ))}
              </div>

              {/* Conversion strip */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60">
                {(["cold", "warm", "referral"] as Lane[]).map((lane) => {
                  const apps = pipelineByLane.applications[lane];
                  const ivs = pipelineByLane.interviews[lane];
                  const rate = pipelineByLane.conversion[lane];
                  const sparse = apps < MIN_LANE_N;
                  return (
                    <div key={lane} className="space-y-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-sm", LANE_DOT[lane])} />
                        {LANE_LABEL[lane]}
                      </div>
                      <div className="font-display text-2xl font-semibold tabular-nums leading-none">
                        {sparse ? "—" : `${Math.round(rate * 100)}%`}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {ivs} / {apps} {apps === 1 ? "app" : "apps"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(["cold", "warm", "referral"] as Lane[]).every(
                l => pipelineByLane.applications[l] < MIN_LANE_N,
              ) && (
                <p className="text-[11px] text-muted-foreground">
                  Add more applications (≥{MIN_LANE_N} per lane) to unlock lane conversion.
                </p>
              )}

              {/* Footer: median time to interview across all lanes */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60 text-[11px]">
                <span className="uppercase tracking-wider font-medium text-muted-foreground">
                  Avg time to interview
                </span>
                <span className="tabular-nums">
                  {pipelineByLane.medianDaysToInterview === null ? (
                    <span className="text-muted-foreground">— No interviews yet</span>
                  ) : (
                    <span className="text-foreground font-medium">
                      {pipelineByLane.medianDaysToInterview}d
                    </span>
                  )}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Time to first interview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-warning" />
                Time to first interview
              </CardTitle>
              <CardDescription className="text-xs">
                Days from application to the earliest scheduled interview, per job.
              </CardDescription>
            </div>
            {avgTimeToFirstInterview !== null && (
              <Badge variant="secondary" className="text-xs">
                Avg {avgTimeToFirstInterview} day{avgTimeToFirstInterview === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {timeToFirstInterview.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No applied jobs with scheduled interviews yet.
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeToFirstInterview}
                  layout="vertical"
                  margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    unit="d"
                  />
                  <YAxis
                    type="category"
                    dataKey="jobLabel"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    width={140}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} day${v === 1 ? "" : "s"}`, "Days to first interview"]}
                  />
                  <Bar dataKey="days" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <PlaceholderHint note="Placeholder formula: per job, max(0, days from job.appliedDate to earliest interview.date). Top 10 longest shown. Awaiting your final definition (e.g. include withdrawn? exclude rejections?)." />
        </CardContent>
      </Card>

      {/* Weekly velocity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <LineIcon className="h-4 w-4 text-info" />
                Weekly velocity
              </CardTitle>
              <CardDescription className="text-xs">
                Applications submitted, interviews scheduled, and outreach activities — last 8 weeks.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
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
                <Line type="monotone" dataKey="interviews" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outreach" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <PlaceholderHint note="Placeholder formula: weeks start Monday. Applications = jobs whose appliedDate falls in week. Interviews = interviews whose date falls in week (any status). Outreach = contact_activities in week. Awaiting your final definition (status filter? rolling avg?)." />
        </CardContent>
      </Card>
    </div>
  );
}
