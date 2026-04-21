import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Rocket, Users, UserSearch, Snowflake, type LucideIcon } from "lucide-react";
import { getCoverageInfo, type CoverageState } from "@/components/targetcompanies/coverageUtils";
import { cn } from "@/lib/utils";
import type { Contact, TargetCompany } from "@/types/jobTracker";

interface Props {
  targetCompanies: TargetCompany[];
  contacts: Contact[];
}

const TILE_META: Record<CoverageState, { label: string; icon: LucideIcon; tone: string }> = {
  booster:   { label: "Booster",   icon: Rocket,     tone: "text-success border-success/25 bg-success/5" },
  connector: { label: "Connector", icon: Users,      tone: "text-info border-info/25 bg-info/5" },
  recruiter: { label: "Recruiter", icon: UserSearch, tone: "text-warning border-warning/25 bg-warning/5" },
  cold:      { label: "Cold",      icon: Snowflake,  tone: "text-muted-foreground border-border bg-muted/40" },
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
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">Target coverage</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{counts.total} active target{counts.total === 1 ? "" : "s"}</p>
        </div>
        <button
          onClick={() => navigate("/target-companies?sort=coverage")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Sourcing view <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER.map(state => {
          const meta = TILE_META[state];
          const count = counts.result[state];
          const Icon = meta.icon;
          return (
            <button
              key={state}
              onClick={() => navigate(`/target-companies?coverage=${state}`)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:opacity-90",
                meta.tone,
              )}
              title={`${count} ${meta.label}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="font-display text-3xl font-semibold leading-none">{count}</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] opacity-80">{meta.label}</span>
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
