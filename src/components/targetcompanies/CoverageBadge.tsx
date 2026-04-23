import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { pillClass, type PillTone } from "@/lib/pillStyles";
import type { CoverageInfo } from "./coverageUtils";
import { COVERAGE_LABELS } from "./coverageUtils";

interface CoverageBadgeProps {
  coverage: CoverageInfo;
  onClick?: () => void;
  className?: string;
}

// Coverage joins the unified pill family. The earlier ad-hoc 4-tone mapping
// (accent/20, accent/5, background, muted) is replaced with the canonical
// tones from `src/lib/pillStyles.ts` so coverage chips read as peers of
// status / priority / warmth chips, not a separate visual language.
//   booster   → amber-strong  (warm relationship — brand emphasis)
//   connector → amber-soft    (warm intent — bridge to a booster)
//   recruiter → navy-muted    (in-pipeline, passive signal)
//   cold      → slate         (no coverage)
const STATE_TONE: Record<CoverageInfo["state"], PillTone> = {
  booster:   "amber-strong",
  connector: "amber-soft",
  recruiter: "navy-muted",
  cold:      "slate",
};

export default function CoverageBadge({ coverage, onClick, className }: CoverageBadgeProps) {
  const conf = COVERAGE_LABELS[coverage.state];
  const tone = STATE_TONE[coverage.state];
  let detail = conf.label;
  if (coverage.state === "booster" && coverage.boosters[0]) detail = `Booster: ${coverage.boosters[0].name}`;
  else if (coverage.state === "connector" && coverage.connectors[0]) detail = `Ask ${coverage.connectors[0].name} for intro`;
  else if (coverage.state === "recruiter" && coverage.recruiters[0]) detail = `Recruiter: ${coverage.recruiters[0].name}`;

  const extraCount = coverage.state === "booster" && coverage.boosters.length > 1
    ? coverage.boosters.length - 1
    : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            pillClass(tone, "sm", "gap-1 cursor-pointer hover:brightness-95"),
            className,
          )}
        >
          <span aria-hidden>{conf.emoji}</span>
          <span className="truncate max-w-[160px]">{conf.short}</span>
          {extraCount > 0 && (
            // Inline "+N" runs as a sibling text node, not a nested pill,
            // so we don't violate the "no pills inside pills" rule from
            // visual-theme-v2.
            <span className="ml-0.5 text-[10px] font-semibold opacity-80">+{extraCount}</span>
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
