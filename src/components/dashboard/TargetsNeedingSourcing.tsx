import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle2, Rocket, Users, UserSearch, Snowflake, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompanyAvatar from "@/components/CompanyAvatar";
import { getCoverageInfo, type CoverageState } from "@/components/targetcompanies/coverageUtils";
import { cn } from "@/lib/utils";
import type { Contact, TargetCompany } from "@/types/jobTracker";

interface Props {
  targetCompanies: TargetCompany[];
  contacts: Contact[];
  /** Max rows to render before showing "View all". Default 5. */
  limit?: number;
}

const PRIORITY_WEIGHT: Record<string, number> = { dream: 2, strong: 1 };
const STATE_WEIGHT: Record<CoverageState, number> = {
  cold: 3,
  recruiter: 2,
  connector: 1,
  booster: 0, // never shown
};

// Target-company priority on the unified pill family — same tones as
// `TargetCompanies` page so the dashboard chip matches the source surface.
const PRIORITY_LABEL: Record<string, { label: string; tone: import("@/lib/pillStyles").PillTone }> = {
  dream:  { label: "Dream",  tone: "amber-strong" },
  strong: { label: "Strong", tone: "navy-muted" },
};

const STATE_META: Record<CoverageState, { label: string; icon: LucideIcon; tone: string }> = {
  booster:   { label: "Has Booster",         icon: Rocket,     tone: "text-success" },
  connector: { label: "Connector available", icon: Users,      tone: "text-info" },
  recruiter: { label: "Recruiter only",      icon: UserSearch, tone: "text-warning" },
  cold:      { label: "No inside path",      icon: Snowflake,  tone: "text-muted-foreground" },
};

export default function TargetsNeedingSourcing({ targetCompanies, contacts, limit = 5 }: Props) {
  const navigate = useNavigate();

  const gaps = useMemo(() => {
    const rows = targetCompanies
      .filter(tc => tc.status !== "archived")
      .filter(tc => tc.priority === "dream" || tc.priority === "strong")
      .map(tc => ({ company: tc, coverage: getCoverageInfo(tc, contacts) }))
      .filter(r => r.coverage.state !== "booster");

    rows.sort((a, b) => {
      const aScore = (PRIORITY_WEIGHT[a.company.priority] || 0) * 10 + STATE_WEIGHT[a.coverage.state];
      const bScore = (PRIORITY_WEIGHT[b.company.priority] || 0) * 10 + STATE_WEIGHT[b.coverage.state];
      return bScore - aScore;
    });
    return rows;
  }, [targetCompanies, contacts]);

  // Don't render at all if user has no high-priority targets — keeps the dashboard quiet for new users.
  const hasHighPriorityActive = targetCompanies.some(
    tc => tc.status !== "archived" && (tc.priority === "dream" || tc.priority === "strong"),
  );
  if (!hasHighPriorityActive) return null;

  const visible = gaps.slice(0, limit);
  const remaining = Math.max(0, gaps.length - visible.length);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Targets needing sourcing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {gaps.length === 0
              ? "Every Dream and Strong target has a Booster"
              : `${gaps.length} high-priority target${gaps.length === 1 ? "" : "s"} without an inside path`}
          </p>
        </div>
        {gaps.length > 0 && (
          <button
            onClick={() => navigate("/target-companies?sort=coverage")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Sourcing view <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {gaps.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <p className="text-xs text-muted-foreground">Nice coverage — keep nurturing.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map(({ company, coverage }) => {
            const stateMeta = STATE_META[coverage.state];
            const StateIcon = stateMeta.icon;
            const prio = PRIORITY_LABEL[company.priority];
            return (
              <button
                key={company.id}
                onClick={() => navigate(`/target-companies?sourcing=${company.id}`)}
                className="group flex w-full items-center gap-3 rounded-md border border-border/60 bg-card p-2.5 text-left transition-colors hover:bg-muted/40"
                aria-label={`Open sourcing panel for ${company.name}`}
              >
                <CompanyAvatar company={company.name} logoUrl={company.logoUrl} website={company.website} size="sm" tone="neutral" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{company.name}</span>
                    {prio && (
                      <span className={pillClass(prio.tone, "xs")}>
                        {prio.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <StateIcon className={cn("h-3 w-3", stateMeta.tone)} strokeWidth={1.75} />
                    <span>{stateMeta.label}</span>
                    {coverage.allAtCompany.length > 0 && (
                      <span>· {coverage.allAtCompany.length} contact{coverage.allAtCompany.length === 1 ? "" : "s"}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-xs text-primary opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  tabIndex={-1}
                >
                  <Sparkles className="h-3 w-3" />
                  {coverage.state === "cold" ? "Find Booster" : "Sourcing"}
                </Button>
              </button>
            );
          })}
          {remaining > 0 && (
            <button
              onClick={() => navigate("/target-companies?sort=coverage")}
              className="w-full py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              + {remaining} more target{remaining === 1 ? "" : "s"} needing sourcing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
