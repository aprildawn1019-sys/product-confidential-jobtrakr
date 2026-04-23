import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pillClass, type PillTone } from "@/lib/pillStyles";

/**
 * Inline legend for the navy/amber/slate pill family. Surfaces show this
 * as a subtle "What do these colors mean?" affordance next to a cluster
 * of pills (interview type, interview status, target-company coverage,
 * etc.) without leaving the page.
 *
 * Each row is a *real* pill — same `pillClass` recipe as the live chips —
 * paired with the meaning in plain English. This way the legend can never
 * drift from the components it documents.
 */

export interface PillLegendItem {
  /** Tone bucket from the shared pill family. */
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
  /** One or more legend sections to render. */
  groups: PillLegendGroup[];
  /** Trigger label. Defaults to "Legend". */
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
// Preset groups so consumer pages don't redefine the same content. Keeping
// the strings here also means the legend stays in sync with the actual
// taxonomy comments in `Interviews.tsx` / `CoverageBadge.tsx`.
// ---------------------------------------------------------------------------

export const INTERVIEW_TYPE_LEGEND: PillLegendGroup = {
  title: "Interview type",
  items: [
    { tone: "slate",        sample: "Phone",      meaning: "Early/neutral round — screening conversation." },
    { tone: "slate",        sample: "Technical",  meaning: "Skills assessment, take-home, or coding round." },
    { tone: "slate",        sample: "Behavioral", meaning: "Values & culture-fit conversation." },
    { tone: "amber-strong", sample: "Onsite",     meaning: "High-stakes round — prep matters most." },
    { tone: "amber-strong", sample: "Final",      meaning: "Closing round before a decision." },
  ],
};

export const INTERVIEW_STATUS_LEGEND: PillLegendGroup = {
  title: "Interview status",
  items: [
    { tone: "navy-muted", sample: "Scheduled", meaning: "On the calendar, in motion." },
    { tone: "slate",      sample: "Completed", meaning: "Done — recorded for the timeline." },
    { tone: "slate",      sample: "Cancelled", meaning: "Removed from the calendar." },
  ],
};

export const COVERAGE_LEGEND: PillLegendGroup = {
  title: "Coverage",
  items: [
    { tone: "amber-strong", sample: "🚀 Booster",   meaning: "Warm relationship inside the company who can advocate for you." },
    { tone: "amber-soft",   sample: "🌉 Connector", meaning: "Someone who can introduce you to a Booster or hiring manager." },
    { tone: "navy-muted",   sample: "👀 Recruiter", meaning: "Recruiter contact — passive signal, not yet warm." },
    { tone: "slate",        sample: "❄️ Cold",      meaning: "No coverage yet — sourcing needed." },
  ],
};
