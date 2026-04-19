import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Send, Phone, CalendarCheck, Coffee, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job, Interview, ContactActivity } from "@/types/jobTracker";

interface WeeklyReviewProps {
  jobs: Job[];
  interviews: Interview[];
  contactActivities: ContactActivity[];
}

const STORAGE_KEY = "jobtrakr.weeklyReview.expanded";

/** Returns Monday 00:00 of the week containing `date` (local time). */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function inRange(value: string | undefined | null, start: Date, end: Date): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t < end.getTime();
}

const FOLLOWUP_TYPES = new Set(["email", "call", "linkedin_message", "message", "follow_up"]);

function delta(curr: number, prev: number): { dir: "up" | "down" | "flat"; label: string } {
  if (curr === prev) return { dir: "flat", label: "—" };
  if (prev === 0) return { dir: "up", label: `+${curr}` };
  const diff = curr - prev;
  return { dir: diff > 0 ? "up" : "down", label: `${diff > 0 ? "+" : ""}${diff}` };
}

export default function WeeklyReview({ jobs, interviews, contactActivities }: WeeklyReviewProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, expanded ? "true" : "false");
  }, [expanded]);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Applications sent: jobs whose applied_date falls in the window
    const apps = (start: Date, end: Date) =>
      jobs.filter(j => inRange(j.appliedDate, start, end)).length;

    // Follow-ups: contact activities of outreach types this week
    const followUps = (start: Date, end: Date) =>
      contactActivities.filter(a => FOLLOWUP_TYPES.has(a.activityType) && inRange(a.activityDate, start, end)).length;

    // Interviews scheduled: interviews occurring in window (status not cancelled)
    const interviewsBooked = (start: Date, end: Date) =>
      interviews.filter(i => i.status !== "cancelled" && inRange(i.date, start, end)).length;

    // Networking meetings completed: contact activity 'meeting' on/before today, in window
    const meetingsDone = (start: Date, end: Date) =>
      contactActivities.filter(a => a.activityType === "meeting" && inRange(a.activityDate, start, end)).length;

    return [
      {
        key: "applications",
        label: "Applications sent",
        icon: Send,
        curr: apps(thisWeekStart, nextWeekStart),
        prev: apps(lastWeekStart, thisWeekStart),
      },
      {
        key: "followups",
        label: "Follow-ups done",
        icon: Phone,
        curr: followUps(thisWeekStart, nextWeekStart),
        prev: followUps(lastWeekStart, thisWeekStart),
      },
      {
        key: "interviews",
        label: "Interviews scheduled",
        icon: CalendarCheck,
        curr: interviewsBooked(thisWeekStart, nextWeekStart),
        prev: interviewsBooked(lastWeekStart, thisWeekStart),
      },
      {
        key: "meetings",
        label: "Networking meetings",
        icon: Coffee,
        curr: meetingsDone(thisWeekStart, nextWeekStart),
        prev: meetingsDone(lastWeekStart, thisWeekStart),
      },
    ];
  }, [jobs, interviews, contactActivities]);

  const total = metrics.reduce((sum, m) => sum + m.curr, 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <h2 className="font-display text-lg font-semibold">Weekly Review</h2>
            <p className="text-xs text-muted-foreground">
              {total === 0 ? "No activity logged this week yet" : `${total} action${total === 1 ? "" : "s"} logged this week · vs last week`}
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4 sm:grid-cols-4">
          {metrics.map(m => {
            const d = delta(m.curr, m.prev);
            const Icon = m.icon;
            const DeltaIcon = d.dir === "up" ? ArrowUp : d.dir === "down" ? ArrowDown : Minus;
            return (
              <div key={m.key} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{m.label}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold tracking-tight">{m.curr}</span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[11px] font-medium",
                      d.dir === "up" && "text-success",
                      d.dir === "down" && "text-destructive",
                      d.dir === "flat" && "text-muted-foreground",
                    )}
                    title={`Last week: ${m.prev}`}
                  >
                    <DeltaIcon className="h-3 w-3" />
                    {d.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
