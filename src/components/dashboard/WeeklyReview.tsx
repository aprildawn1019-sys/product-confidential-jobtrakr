import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { Job, Interview, ContactActivity } from "@/types/jobTracker";

interface WeeklyReviewProps {
  jobs: Job[];
  interviews: Interview[];
  contactActivities: ContactActivity[];
}

/** Returns Monday 00:00 of the week containing `date` (local time). */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

const FOLLOWUP_TYPES = new Set(["email", "call", "linkedin_message", "message", "follow_up"]);

/**
 * Spec source: src/assets/dashboard-mockup.jpg.
 * Always-open card with a small multi-color bar chart of this week's activity
 * by day (Mon–Sun). Each bar is segmented across the four metrics. No more
 * collapsible chevron — the chart is the panel content.
 */
export default function WeeklyReview({ jobs, interviews, contactActivities }: WeeklyReviewProps) {
  const { data, total } = useMemo(() => {
    const now = new Date();
    const monday = startOfWeek(now);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });

    const sameDay = (iso: string | null | undefined, day: Date) => {
      if (!iso) return false;
      const t = new Date(iso);
      if (Number.isNaN(t.getTime())) return false;
      return (
        t.getFullYear() === day.getFullYear() &&
        t.getMonth() === day.getMonth() &&
        t.getDate() === day.getDate()
      );
    };

    const rows = days.map(d => {
      const apps = jobs.filter(j => sameDay(j.appliedDate, d)).length;
      const follow = contactActivities.filter(a => FOLLOWUP_TYPES.has(a.activityType) && sameDay(a.activityDate, d)).length;
      const ivs = interviews.filter(i => i.status !== "cancelled" && sameDay(i.date, d)).length;
      const meet = contactActivities.filter(a => a.activityType === "meeting" && sameDay(a.activityDate, d)).length;
      return {
        day: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
        apps,
        follow,
        ivs,
        meet,
      };
    });

    const total = rows.reduce((s, r) => s + r.apps + r.follow + r.ivs + r.meet, 0);
    return { data: rows, total };
  }, [jobs, interviews, contactActivities]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Weekly review</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total === 0 ? "No activity logged this week yet" : `${total} action${total === 1 ? "" : "s"} this week`}
          </p>
        </div>
        <div className="hidden gap-3 text-[10px] uppercase tracking-wider text-muted-foreground sm:flex">
          <Legend swatchClass="bg-primary" label="Apps" />
          <Legend swatchClass="bg-accent" label="Follow-ups" />
          <Legend swatchClass="bg-info" label="Interviews" />
          <Legend swatchClass="bg-success" label="Meetings" />
        </div>
      </div>

      <div className="h-44">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Log applications, follow-ups, or interviews to see this week's mix.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="apps" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
              <Bar dataKey="follow" stackId="a" fill="hsl(var(--accent))" />
              <Bar dataKey="ivs" stackId="a" fill="hsl(var(--info))" />
              <Bar dataKey="meet" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm ${swatchClass}`} />
      {label}
    </span>
  );
}
