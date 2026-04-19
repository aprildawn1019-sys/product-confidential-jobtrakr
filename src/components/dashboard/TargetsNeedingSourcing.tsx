import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompanyAvatar from "@/components/CompanyAvatar";
import {
  getCoverageInfo,
  COVERAGE_LABELS,
  type CoverageState,
} from "@/components/targetcompanies/coverageUtils";
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

const PRIORITY_LABEL: Record<string, { label: string; className: string }> = {
  dream: { label: "Dream", className: "bg-success/10 text-success border-success/30" },
  strong: { label: "Strong", className: "bg-info/10 text-info border-info/30" },
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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 text-warning shrink-0" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground truncate">
            Targets needing sourcing
          </h2>
          {gaps.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{gaps.length}</Badge>
          )}
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
          <p className="text-xs text-muted-foreground">
            Every Dream and Strong target has a Booster. Nice coverage.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map(({ company, coverage }) => {
            const stateMeta = COVERAGE_LABELS[coverage.state];
            const prio = PRIORITY_LABEL[company.priority];
            return (
              <button
                key={company.id}
                onClick={() => navigate(`/target-companies?sourcing=${company.id}`)}
                className="group w-full flex items-center gap-3 rounded-md border border-border bg-card p-2.5 text-left hover:bg-muted/40 transition-colors"
                aria-label={`Open sourcing panel for ${company.name}`}
              >
                <CompanyAvatar company={company.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{company.name}</span>
                    {prio && (
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", prio.className)}>
                        {prio.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span aria-hidden>{stateMeta.emoji}</span>
                    <span>{stateMeta.label}</span>
                    {coverage.allAtCompany.length > 0 && (
                      <span>· {coverage.allAtCompany.length} contact{coverage.allAtCompany.length === 1 ? "" : "s"}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
            >
              + {remaining} more target{remaining === 1 ? "" : "s"} needing sourcing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
