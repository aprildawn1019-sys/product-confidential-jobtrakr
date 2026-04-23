import { cn } from "@/lib/utils";

/**
 * Pill family — single source of truth for every status / type / warmth /
 * priority / coverage chip in the app. Locks the UI to the navy/amber/slate
 * palette called out in `mem://style/visual-theme-v2`:
 *
 *   "Soft, single-tone pills. Amber for warm/high, navy-muted for medium,
 *    slate for low/cold. No nested pills inside other pills."
 *
 * | tone           | role                                                 | sample states                                       |
 * |----------------|------------------------------------------------------|-----------------------------------------------------|
 * | `amber-strong` | primary brand emphasis (warm + active)               | Interviewing, Offer, High, Champion, Hot, Booster   |
 * | `amber-soft`   | secondary brand emphasis (warm intent / in-flight)   | Applied, Screening, Medium, Warm, Connector         |
 * | `navy-muted`   | pipeline-active neutral (in the funnel, not warm)    | Saved, Scheduled, Strong target                     |
 * | `slate`        | quiet / cold / terminal (out of funnel)              | Withdrawn, Closed, Rejected, Low, Cold, Archived    |
 *
 * Why no `destructive` (red) or `success` (green) tone:
 *   The spec treats terminal states as *quiet*, not alarming — Linear/Notion
 *   convention. Red is reserved for genuine destructive *actions* (delete),
 *   never for descriptive status chips. Same for green.
 */

export type PillTone = "amber-strong" | "amber-soft" | "navy-muted" | "slate";
export type PillDensity = "xs" | "sm" | "md";

const TONE_CLASSES: Record<PillTone, string> = {
  "amber-strong": "bg-accent/20 text-accent-foreground border-accent/40",
  "amber-soft":   "bg-accent/8 text-accent-foreground border-accent/25",
  "navy-muted":   "bg-primary/8 text-primary border-primary/20",
  "slate":        "bg-muted text-muted-foreground border-border",
};

const DENSITY_CLASSES: Record<PillDensity, string> = {
  xs: "text-[10px] px-1.5 py-0 h-4",
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
};

/** Compose pill class names. Use this — never hand-roll
 *  `bg-{success,warning,destructive,info}/...` on a status-style chip. */
export function pillClass(tone: PillTone, density: PillDensity = "sm", extra?: string): string {
  return cn(
    "inline-flex items-center rounded-full border font-semibold whitespace-nowrap transition-colors",
    TONE_CLASSES[tone],
    DENSITY_CLASSES[density],
    extra,
  );
}

/** Trigger variant for `<SelectTrigger>` that opens a status/type dropdown.
 *  Same tone vocabulary, plus a min-width and chevron sizing rule so trigger
 *  and resting pill are visually identical. */
export function pillTriggerClass(tone: PillTone, extra?: string): string {
  return cn(
    "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider text-[11px] h-7 w-auto min-w-[100px] px-2.5 transition-colors",
    "[&>svg]:h-3 [&>svg]:w-3",
    TONE_CLASSES[tone],
    extra,
  );
}

/** Solid dot indicator for SelectItem rows — keeps dropdown options visually
 *  consistent with the pill they will become. */
export function pillDotClass(tone: PillTone): string {
  const SOLID: Record<PillTone, string> = {
    "amber-strong": "bg-accent",
    "amber-soft":   "bg-accent/60",
    "navy-muted":   "bg-primary",
    "slate":        "bg-muted-foreground/60",
  };
  return cn("h-2 w-2 rounded-full shrink-0", SOLID[tone]);
}

// ---------------------------------------------------------------------------
// Taxonomy → tone presets
//
// These are the *only* place where a domain value (interview type, target
// company priority, etc.) maps to a `PillTone`. Consumer pages import the
// preset and call `pillClass(preset[value].tone, …)` instead of hand-rolling
// `bg-accent/15 text-accent-foreground …` strings. Keeps Interviews,
// TargetCompanies, the dashboard, and `PillLegend` in sync by construction.
// ---------------------------------------------------------------------------

export interface PillPreset {
  label: string;
  tone: PillTone;
}

/** Interview type — Phone/Technical/Behavioral are early rounds (slate);
 *  Onsite/Final are high-stakes brand-emphasis rounds (amber-strong). */
export const INTERVIEW_TYPE_PILLS: Record<string, PillPreset> = {
  phone:      { label: "Phone",      tone: "slate" },
  technical:  { label: "Technical",  tone: "slate" },
  behavioral: { label: "Behavioral", tone: "slate" },
  onsite:     { label: "Onsite",     tone: "amber-strong" },
  final:      { label: "Final",      tone: "amber-strong" },
};

/** Interview status — Scheduled is in-motion (navy-muted); Completed and
 *  Cancelled are quiet/terminal (slate). No destructive red on cancellations
 *  per the family contract above. */
export const INTERVIEW_STATUS_PILLS: Record<string, PillPreset> = {
  scheduled: { label: "Scheduled", tone: "navy-muted" },
  completed: { label: "Completed", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

/** Target-company priority — Dream = brand-emphasis (amber-strong),
 *  Strong = committed-but-cool (navy-muted), Interested = quiet (slate). */
export const TARGET_PRIORITY_PILLS: Record<string, PillPreset> = {
  dream:      { label: "Dream",      tone: "amber-strong" },
  strong:     { label: "Strong",     tone: "navy-muted" },
  interested: { label: "Interested", tone: "slate" },
};

/** Target-company status — Researching/Archived are quiet (slate), Applied is
 *  in-pipeline (navy-muted), Connected is a warm relationship (amber-strong).
 *  "Strong priority" and "Applied status" intentionally share the navy tone —
 *  both are the "active/committed" signal in their respective axes, and they
 *  never appear on the same pill so collision isn't a scannability risk. */
export const TARGET_STATUS_PILLS: Record<string, PillPreset> = {
  researching: { label: "Researching", tone: "slate" },
  applied:     { label: "Applied",     tone: "navy-muted" },
  connected:   { label: "Connected",   tone: "amber-strong" },
  archived:    { label: "Archived",    tone: "slate" },
};

/** Coverage state on a target company — see `coverageUtils.ts`. */
export const COVERAGE_PILLS: Record<string, PillPreset> = {
  booster:   { label: "Booster",   tone: "amber-strong" },
  connector: { label: "Connector", tone: "amber-soft" },
  recruiter: { label: "Recruiter", tone: "navy-muted" },
  cold:      { label: "Cold",      tone: "slate" },
};
