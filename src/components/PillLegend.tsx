import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  pillClass,
  type PillTone,
  INTERVIEW_TYPE_PILLS,
  INTERVIEW_STATUS_PILLS,
  COVERAGE_PILLS,
  TARGET_PRIORITY_PILLS,
  TARGET_STATUS_PILLS,
} from "@/lib/pillStyles";

/**
 * Inline legend for the navy/amber/slate pill family. Surfaces show this as
 * a subtle "What do these colors mean?" affordance next to a cluster of pills
 * (interview type, interview status, coverage, target-company priority…)
 * without leaving the page.
 *
 * Each row is a *real* pill — same `pillClass` recipe as the live chips —
 * so the legend can never drift from the components it documents.
 */

export interface PillLegendItem {
  tone: PillTone;
  /** Sample label rendered inside the pill (matches a real chip). */
  sample: string;
  /** Plain-English meaning shown next to the pill. */
  meaning: string;
}

export interface PillLegendGroup {
  /** Section heading — e.g. "Interview type", "Coverage". */
  title: string;
  items: PillLegendItem[];
}

interface PillLegendProps {
  groups: PillLegendGroup[];
  label?: string;
  className?: string;
}

export default function PillLegend({ groups, label = "Legend", className }: PillLegendProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            "inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground " +
            (className ?? "")
          }
          aria-label={`${label} — what the pill colors mean`}
        >
          <Info className="h-3 w-3" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">What the colors mean</p>
          <p className="text-[11px] text-muted-foreground">
            One pill family, three tones — amber for warm/active, navy for in-pipeline, slate for quiet.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
          {groups.map((group) => (
            <section key={group.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {group.title}
              </h4>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.sample}`} className="flex items-start gap-2">
                    <span className={pillClass(item.tone, "xs", "shrink-0 mt-0.5 capitalize")}>
                      {item.sample}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {item.meaning}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Preset groups derived from the canonical taxonomy maps in `pillStyles.ts`,
// so the legend's tones are guaranteed to match the live chips. Only the
// English `meaning` strings live here.
// ---------------------------------------------------------------------------

const INTERVIEW_TYPE_MEANINGS: Record<string, string> = {
  phone:      "Early/neutral round — screening conversation.",
  technical:  "Skills assessment, take-home, or coding round.",
  behavioral: "Values & culture-fit conversation.",
  onsite:     "High-stakes round — prep matters most.",
  final:      "Closing round before a decision.",
};

const INTERVIEW_STATUS_MEANINGS: Record<string, string> = {
  scheduled: "On the calendar, in motion.",
  completed: "Done — recorded for the timeline.",
  cancelled: "Removed from the calendar.",
};

const COVERAGE_MEANINGS: Record<string, { sample: string; meaning: string }> = {
  booster:   { sample: "🚀 Booster",   meaning: "Warm relationship inside the company who can advocate for you." },
  connector: { sample: "🌉 Connector", meaning: "Someone who can introduce you to a Booster or hiring manager." },
  recruiter: { sample: "👀 Recruiter", meaning: "Recruiter contact — passive signal, not yet warm." },
  cold:      { sample: "❄️ Cold",      meaning: "No coverage yet — sourcing needed." },
};

const TARGET_PRIORITY_MEANINGS: Record<string, string> = {
  dream:      "Top of the list — go all-in.",
  strong:     "High intent — actively pursuing.",
  interested: "On the radar — quiet on the list.",
};

const TARGET_STATUS_MEANINGS: Record<string, string> = {
  researching: "Investigating fit — no application yet.",
  applied:     "Application submitted, in pipeline.",
  connected:   "Active relationship inside the company.",
  archived:    "Set aside — not currently pursuing.",
};

function fromPreset(
  title: string,
  preset: Record<string, { label: string; tone: PillTone }>,
  meanings: Record<string, string>,
): PillLegendGroup {
  return {
    title,
    items: Object.entries(preset).map(([key, { label, tone }]) => ({
      tone,
      sample: label,
      meaning: meanings[key] ?? "",
    })),
  };
}

export const INTERVIEW_TYPE_LEGEND: PillLegendGroup = fromPreset(
  "Interview type",
  INTERVIEW_TYPE_PILLS,
  INTERVIEW_TYPE_MEANINGS,
);

export const INTERVIEW_STATUS_LEGEND: PillLegendGroup = fromPreset(
  "Interview status",
  INTERVIEW_STATUS_PILLS,
  INTERVIEW_STATUS_MEANINGS,
);

// Coverage uses emoji + label as the sample, so it's built directly rather
// than via fromPreset (which uses the bare label).
export const COVERAGE_LEGEND: PillLegendGroup = {
  title: "Coverage",
  items: Object.entries(COVERAGE_PILLS).map(([key, { tone }]) => ({
    tone,
    sample: COVERAGE_MEANINGS[key].sample,
    meaning: COVERAGE_MEANINGS[key].meaning,
  })),
};

export const TARGET_PRIORITY_LEGEND: PillLegendGroup = fromPreset(
  "Priority",
  TARGET_PRIORITY_PILLS,
  TARGET_PRIORITY_MEANINGS,
);

export const TARGET_STATUS_LEGEND: PillLegendGroup = fromPreset(
  "Status",
  TARGET_STATUS_PILLS,
  TARGET_STATUS_MEANINGS,
);
