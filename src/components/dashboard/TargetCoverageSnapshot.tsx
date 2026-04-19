import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { getCoverageInfo, COVERAGE_LABELS, type CoverageState } from "@/components/targetcompanies/coverageUtils";
import { cn } from "@/lib/utils";
import type { Contact, TargetCompany } from "@/types/jobTracker";

interface Props {
  targetCompanies: TargetCompany[];
  contacts: Contact[];
}

const STATE_STYLES: Record<CoverageState, string> = {
  booster: "bg-success/10 text-success border-success/30",
  connector: "bg-info/10 text-info border-info/30",
  recruiter: "bg-warning/10 text-warning border-warning/30",
  cold: "bg-muted text-muted-foreground border-border",
};

const ORDER: CoverageState[] = ["booster", "connector", "recruiter", "cold"];

export default function TargetCoverageSnapshot({ targetCompanies, contacts }: Props) {
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const active = targetCompanies.filter(tc => tc.status !== "archived");
    const result: Record<CoverageState, number> = { booster: 0, connector: 0, recruiter: 0, cold: 0 };
    active.forEach(tc => {
      const info = getCoverageInfo(tc, contacts);
      result[info.state]++;
    });
    return { result, total: active.length };
  }, [targetCompanies, contacts]);

  if (counts.total === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-success" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Target Coverage
          </h2>
          <span className="text-xs text-muted-foreground">({counts.total} active)</span>
        </div>
        <button
          onClick={() => navigate("/target-companies?sort=coverage")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sourcing view <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER.map(state => {
          const meta = COVERAGE_LABELS[state];
          const count = counts.result[state];
          return (
            <button
              key={state}
              onClick={() => navigate(`/target-companies?coverage=${state}`)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 transition-colors hover:opacity-80",
                STATE_STYLES[state],
              )}
              title={`${count} ${meta.label}`}
            >
              <span className="text-lg leading-none">{meta.emoji}</span>
              <span className="font-display text-2xl font-bold leading-none">{count}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{meta.short}</span>
            </button>
          );
        })}
      </div>
      {counts.result.cold > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {counts.result.cold} cold target{counts.result.cold === 1 ? "" : "s"} need an inside path. Open the sourcing view to find Boosters.
        </p>
      )}
    </div>
  );
}
