import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CoverageInfo } from "./coverageUtils";
import { COVERAGE_LABELS } from "./coverageUtils";

interface CoverageBadgeProps {
  coverage: CoverageInfo;
  onClick?: () => void;
  className?: string;
}

// Single-tone status pills using the design-system status family.
// booster → success, connector → info, recruiter → warning, cold → muted.
const STATE_STYLES: Record<CoverageInfo["state"], string> = {
  booster: "bg-success/15 text-success border-success/30 hover:bg-success/25",
  connector: "bg-info/15 text-info border-info/30 hover:bg-info/25",
  recruiter: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25",
  cold: "bg-muted text-muted-foreground border-border hover:bg-muted/70",
};

export default function CoverageBadge({ coverage, onClick, className }: CoverageBadgeProps) {
  const conf = COVERAGE_LABELS[coverage.state];
  let detail = conf.label;
  if (coverage.state === "booster" && coverage.boosters[0]) detail = `Booster: ${coverage.boosters[0].name}`;
  else if (coverage.state === "connector" && coverage.connectors[0]) detail = `Ask ${coverage.connectors[0].name} for intro`;
  else if (coverage.state === "recruiter" && coverage.recruiters[0]) detail = `Recruiter: ${coverage.recruiters[0].name}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
            STATE_STYLES[coverage.state],
            className,
          )}
        >
          <span aria-hidden>{conf.emoji}</span>
          <span className="truncate max-w-[160px]">{conf.short}</span>
          {coverage.state === "booster" && coverage.boosters.length > 1 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">+{coverage.boosters.length - 1}</Badge>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{detail}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Click to open sourcing panel</p>
      </TooltipContent>
    </Tooltip>
  );
}
