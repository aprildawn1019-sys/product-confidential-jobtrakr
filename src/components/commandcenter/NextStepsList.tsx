import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Sparkles, Loader2, ArrowRight } from "lucide-react";
import NextStepRow from "./NextStepRow";
import { cn } from "@/lib/utils";
import type { DerivedAction, ActionLane, ActionUrgency } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

type FilterKey = "all" | "today" | "overdue" | ActionLane;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "networking", label: "Networking" },
  { key: "applications", label: "Applications" },
  { key: "referrals", label: "Referrals" },
];

interface NextStepsListProps {
  actions: DerivedAction[];
  completed: Set<string>;
  onComplete: (signature: string) => void;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
  /** Trigger AI fetch — rendered as inline list row at the bottom. */
  onRequestAi?: () => void;
  aiLoading?: boolean;
}

interface CohortConfig {
  key: "overdue" | "today" | "later";
  label: string;
  match: (urgency: ActionUrgency) => boolean;
  /** When true (Overdue), child rows render the days-overdue chip. */
  showUrgencyChip: boolean;
}

const COHORTS: CohortConfig[] = [
  {
    key: "overdue",
    label: "Overdue",
    match: (u) => u === "overdue",
    showUrgencyChip: true,
  },
  {
    key: "today",
    label: "Today",
    match: (u) => u === "today",
    showUrgencyChip: false,
  },
  {
    key: "later",
    label: "Later this week",
    match: (u) => u === "soon" || u === "later",
    showUrgencyChip: false,
  },
];

const COHORT_CAP = 4;

/**
 * Filter chip — quiet, single-row pill bar. Replaces the orphaned
 * "Suggest" ghost button as the primary header affordance.
 */
function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={cn("text-[10px]", active ? "opacity-70" : "opacity-60")}>{count}</span>
      )}
    </button>
  );
}

export default function NextStepsList({
  actions,
  completed,
  onComplete,
  onSnooze,
  onRequestAi,
  aiLoading = false,
}: NextStepsListProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  // Per-cohort expansion: cohorts are capped at COHORT_CAP rows by default;
  // "+N more" expands inline so the page never grows beyond the user's intent.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (filter === "all") return actions;
    if (filter === "today") return actions.filter((a) => a.urgency === "today");
    if (filter === "overdue") return actions.filter((a) => a.urgency === "overdue");
    return actions.filter((a) => a.lane === filter);
  }, [actions, filter]);

  const counts = useMemo(
    () => ({
      today: actions.filter((a) => a.urgency === "today").length,
      overdue: actions.filter((a) => a.urgency === "overdue").length,
      networking: actions.filter((a) => a.lane === "networking").length,
      applications: actions.filter((a) => a.lane === "applications").length,
      referrals: actions.filter((a) => a.lane === "referrals").length,
    }),
    [actions],
  );

  // Build cohort buckets from the filtered list.
  const cohorts = useMemo(
    () =>
      COHORTS.map((cohort) => ({
        ...cohort,
        items: filtered.filter((a) => cohort.match(a.urgency)),
      })).filter((c) => c.items.length > 0),
    [filtered],
  );

  const isEmpty = actions.length === 0;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;

  return (
    <div className="space-y-4">
      {/* Filter chip group — replaces the bottom-right "Suggest" button as the
          panel's primary affordance. Quiet visual weight; counts inline. */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? undefined
                : counts[f.key as keyof typeof counts];
            // Hide chips with zero matches except "All" — keeps the row tight.
            if (f.key !== "all" && (count ?? 0) === 0) return null;
            return (
              <FilterChip
                key={f.key}
                active={filter === f.key}
                count={count}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </FilterChip>
            );
          })}
        </div>
      )}

      {isEmpty ? (
        <EmptyState onRequestAi={onRequestAi} aiLoading={aiLoading} />
      ) : isFilteredEmpty ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No actions match this filter.
        </p>
      ) : (
        <div className="space-y-5">
          {cohorts.map((cohort) => {
            const isExpanded = expanded[cohort.key];
            const visible = isExpanded ? cohort.items : cohort.items.slice(0, COHORT_CAP);
            const hidden = cohort.items.length - visible.length;
            return (
              <div key={cohort.key}>
                <div className="mb-1.5 flex items-baseline gap-2 px-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {cohort.label}
                  </h3>
                  <span className="text-[11px] text-muted-foreground/70">
                    {cohort.items.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {visible.map((a) => (
                    <NextStepRow
                      key={a.signature}
                      action={a}
                      isCompleted={completed.has(a.signature)}
                      onComplete={onComplete}
                      onSnooze={onSnooze}
                      showUrgencyChip={cohort.showUrgencyChip}
                    />
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => ({ ...s, [cohort.key]: true }))}
                      className="ml-2 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      +{hidden} more in {cohort.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* AI suggest as inline list row — shares row pattern, lives at the
              tail of the list so it feels like "ask for one more" rather than
              an orphaned panel control. */}
          {onRequestAi && (
            <button
              type="button"
              onClick={onRequestAi}
              disabled={aiLoading}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                "hover:bg-muted/40 focus:outline-none focus:bg-muted/40",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                {aiLoading ? "Thinking…" : "Suggest more steps with AI"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state — replaces "Inbox zero" dead-end with three concrete next moves.
 * Reading this should tell the user *exactly* what to do, not just congratulate.
 */
function EmptyState({
  onRequestAi,
  aiLoading,
}: {
  onRequestAi?: () => void;
  aiLoading?: boolean;
}) {
  return (
    <div className="py-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium">Nothing on your plate</p>
          <p className="text-xs text-muted-foreground">Plan your next move:</p>
        </div>
      </div>
      <div className="space-y-1 pl-1">
        <Link
          to="/target-companies"
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          Add a target company
        </Link>
        <Link
          to="/contacts"
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          Log this week's outreach
        </Link>
        {onRequestAi && (
          <button
            type="button"
            onClick={onRequestAi}
            disabled={aiLoading}
            className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
            )}
            Ask AI for a fresh batch
          </button>
        )}
      </div>
    </div>
  );
}
