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
 * Placeholder bucket for the three lanes used elsewhere in the app.
 * Final response-rate formulas pending — see TODO in component.
 */
const LANES = ["referrals", "networking", "applications"] as const;
type Lane = typeof LANES[number];

const LANE_COLORS: Record<Lane, string> = {
  referrals: "hsl(var(--success))",
  networking: "hsl(var(--info))",
  applications: "hsl(var(--primary))",
};

const LANE_LABEL: Record<Lane, string> = {
  referrals: "Referrals",
  networking: "Networking",
  applications: "Applications",
};

function PlaceholderHint({ note }: { note: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2.5">
      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

export default function Overview({
  jobs, contacts, interviews, contactActivities, jobContacts, recommendationRequests,
}: OverviewProps) {
  const navigate = useNavigate();

  // ---------- Response rate by lane (PLACEHOLDER) ----------
  // TODO(metric): Replace with the agreed formula once provided.
  // Current stub: ratio of contacts with ≥1 logged activity to total contacts in each lane bucket.
  const responseRateData = useMemo(() => {
    // Lane assignment for contacts is approximate until you confirm the rule:
    //  - referrals  = contacts linked to a job (job_contacts) OR with a recommendation_request
    //  - networking = contacts NOT in referrals (general network)
    //  - applications = jobs themselves (denominator: applications submitted, numerator: jobs with status beyond `applied`)
    const referralContactIds = new Set<string>([
      ...jobContacts.map(jc => jc.contactId),
      ...recommendationRequests.map(r => r.contactId),
    ]);

    const networkingContacts = contacts.filter(c => !referralContactIds.has(c.id));
    const referralContacts = contacts.filter(c => referralContactIds.has(c.id));

    const hasActivity = (cid: string) => contactActivities.some(a => a.contactId === cid);

    const referralsRate = referralContacts.length > 0
      ? Math.round((referralContacts.filter(c => hasActivity(c.id)).length / referralContacts.length) * 100)
      : 0;
    const networkingRate = networkingContacts.length > 0
      ? Math.round((networkingContacts.filter(c => hasActivity(c.id)).length / networkingContacts.length) * 100)
      : 0;

    const applied = jobs.filter(j => j.appliedDate);
    const responded = applied.filter(j =>
      ["screening", "interviewing", "offer", "rejected"].includes(j.status),
    );
    const applicationsRate = applied.length > 0
      ? Math.round((responded.filter(j => j.status !== "rejected").length / applied.length) * 100)
      : 0;

    return [
      { lane: LANE_LABEL.referrals, rate: referralsRate, key: "referrals" as Lane, sample: referralContacts.length },
      { lane: LANE_LABEL.networking, rate: networkingRate, key: "networking" as Lane, sample: networkingContacts.length },
      { lane: LANE_LABEL.applications, rate: applicationsRate, key: "applications" as Lane, sample: applied.length },
    ];
  }, [contacts, contactActivities, jobContacts, recommendationRequests, jobs]);

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

      {/* Response rate by lane */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Response rate by lane
              </CardTitle>
              <CardDescription className="text-xs">
                Share of efforts in each lane that received a response.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseRateData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="lane" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name, item) => [`${value}%`, `${LANE_LABEL[(item.payload as { key: Lane }).key]} · n=${(item.payload as { sample: number }).sample}`]}
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {responseRateData.map((d) => (
                    <Cell key={d.key} fill={LANE_COLORS[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <PlaceholderHint note="Placeholder formula. Referrals = contacts linked to a job/recommendation; Networking = remaining contacts; Applications = applied jobs that progressed past 'applied'. Awaiting your final definitions." />
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
