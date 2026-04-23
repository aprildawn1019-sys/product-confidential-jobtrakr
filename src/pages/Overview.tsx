import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type {
  Job, Contact, Interview, ContactActivity, JobContact, RecommendationRequest,
} from "@/types/jobTracker";
import { parseLocalDate } from "@/lib/localDate";
import { WeeklyPlanCard } from "@/components/insights/WeeklyPlanCard";
import { PipelineLaneFunnel } from "@/components/insights/PipelineLaneFunnel";

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

  // Weekly velocity chart now lives inside <WeeklyPlanCard /> (collapsible 8-week trend),
  // sourced from the same data via the generate-weekly-plan edge function.


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
              {/* Pendo-style left-to-right funnel */}
              <PipelineLaneFunnel
                data={{
                  referral: {
                    applications: pipelineByLane.applications.referral,
                    interviews: pipelineByLane.interviews.referral,
                  },
                  warm: {
                    applications: pipelineByLane.applications.warm,
                    interviews: pipelineByLane.interviews.warm,
                  },
                  cold: {
                    applications: pipelineByLane.applications.cold,
                    interviews: pipelineByLane.interviews.cold,
                  },
                }}
                minLaneN={MIN_LANE_N}
              />

              {(["cold", "warm", "referral"] as Lane[]).every(
                l => pipelineByLane.applications[l] < MIN_LANE_N,
              ) && (
                <p className="text-[11px] text-muted-foreground">
                  Add more applications (≥{MIN_LANE_N} per lane) to unlock lane conversion.
                </p>
              )}

              {/* Footer: median time to interview across all lanes */}
              <div className="mt-2 -mx-6 px-6 py-3 border-t border-border/60 bg-gradient-to-b from-transparent to-muted/30 rounded-b-xl">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="uppercase tracking-wider font-medium text-muted-foreground">
                    Median time to interview
                  </span>
                  {pipelineByLane.medianDaysToInterview === null ? (
                    <span className="text-muted-foreground">— No interviews yet</span>
                  ) : (
                    <span className="font-display text-base font-semibold tabular-nums text-foreground">
                      {pipelineByLane.medianDaysToInterview}
                      <span className="text-muted-foreground font-medium ml-0.5">d</span>
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground normal-case tracking-normal">
                        median across all lanes
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Weekly Plan — scoreboard + AI-recommended actions + collapsible 8-week trend */}
      <WeeklyPlanCard />
    </div>
  );
}
