import { cn } from "@/lib/utils";

/**
 * Pill family — single source of truth for all status / type / warmth /
 * priority / coverage chips. Locks the app to the navy/amber/slate palette
 * called out in `mem://style/visual-theme-v2`:
 *
 *   "Soft, single-tone pills. Amber for warm/high, navy-muted for medium,
 *    slate for low/cold. No nested pills inside other pills."
 *
 * Three tones, one density variant on amber so we can still differentiate
 * "Interviewing" from "Screening" or "High" from "Medium" without leaking
 * a fourth hue (green, red, blue) into the chrome.
 *
 * | tone           | role                                                     | sample states                                       |
 * |----------------|----------------------------------------------------------|-----------------------------------------------------|
 * | `amber-strong` | primary brand emphasis (warm + active)                   | Interviewing, Offer, High, Champion, Hot, Booster   |
 * | `amber-soft`   | secondary brand emphasis (warm intent / in-flight)       | Applied, Screening, Medium, Warm, Connector         |
 * | `navy-muted`   | pipeline-active neutral (in the funnel, not yet warm)    | Saved, generic "active"                             |
 * | `slate`        | quiet / cold / terminal (out of the funnel or de-emphasized) | Withdrawn, Closed, Rejected, Low, Cold, Recruiter |
 *
 * Why no `destructive` (red) tone:
 *   The spec treats terminal states (Rejected/Closed) as *quiet*, not
 *   alarming — Linear/Notion convention. Red is reserved for genuine
 *   destructive *actions* (delete, force-remove) and never for descriptive
 *   status chips. Same reason there is no `success` (green) tone.
 *
 * Shape contract:
 *   All pills share `inline-flex items-center rounded-full border` and a
 *   text size of `text-[11px]` for compact list density (`text-xs` for
 *   triggers/dropdowns where they sit alone). Padding may scale via the
 *   `density` prop but the radius and border are invariant.
 */

export type PillTone = "amber-strong" | "amber-soft" | "navy-muted" | "slate";
export type PillDensity = "xs" | "sm" | "md";

const TONE_CLASSES: Record<PillTone, string> = {
  // Filled amber wash. Brand-warm, used sparingly.
  "amber-strong": "bg-accent/20 text-accent-foreground border-accent/40",
  // Outlined amber — same hue at lower density. Differentiates "warm intent"
  // from "warm relationship" without changing color.
  "amber-soft":   "bg-accent/8 text-accent-foreground border-accent/25",
  // Navy ink on a near-transparent navy wash. Reads as "in the pipeline,
  // not yet warm".
  "navy-muted":   "bg-primary/8 text-primary border-primary/20",
  // Quiet slate — the only neutral chip. Used for cold/closed/withdrawn.
  "slate":        "bg-muted text-muted-foreground border-border",
};

const DENSITY_CLASSES: Record<PillDensity, string> = {
  xs: "text-[10px] px-1.5 py-0 h-4",
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
};

/**
 * Compose pill class names. Use this — never hand-roll
 * `bg-{success,warning,destructive,info}/...` on a status-style chip.
 */
export function pillClass(tone: PillTone, density: PillDensity = "sm", extra?: string): string {
  return cn(
    "inline-flex items-center rounded-full border font-semibold whitespace-nowrap transition-colors",
    TONE_CLASSES[tone],
    DENSITY_CLASSES[density],
    extra,
  );
}

/**
 * Trigger variant — for `<SelectTrigger>` that opens a status/type dropdown.
 * Same tone vocabulary, but adds `min-w-*` and the chevron sizing rule so
 * trigger and resting pill are visually identical.
 */
export function pillTriggerClass(tone: PillTone, extra?: string): string {
  return cn(
    "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider text-[11px] h-7 w-auto min-w-[100px] px-2.5 transition-colors",
    "[&>svg]:h-3 [&>svg]:w-3",
    TONE_CLASSES[tone],
    extra,
  );
}

/**
 * Dot indicator for use inside SelectItem rows — keeps the dropdown
 * options visually consistent with the pill they will become.
 */
export function pillDotClass(tone: PillTone): string {
  // Strip alpha + bg- prefix from the wash so the dot reads as a solid
  // tone marker rather than a mini-pill.
  const SOLID: Record<PillTone, string> = {
    "amber-strong": "bg-accent",
    "amber-soft":   "bg-accent/60",
    "navy-muted":   "bg-primary",
    "slate":        "bg-muted-foreground/60",
  };
  return cn("h-2 w-2 rounded-full shrink-0", SOLID[tone]);
}
