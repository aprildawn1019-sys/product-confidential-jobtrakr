import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types/jobTracker";
import { pillClass, type PillTone } from "@/lib/pillStyles";

/**
 * Status taxonomy mapped onto the unified pill family (navy/amber/slate).
 * See `src/lib/pillStyles.ts` for the why; in short:
 *
 *   amber-strong = warm + active   (Interviewing, Offer)
 *   amber-soft   = in-flight       (Applied, Screening)
 *   navy-muted   = pipeline neutral(Saved)
 *   slate        = quiet/terminal  (Withdrawn, Closed, Rejected)
 *
 * Closed adds `line-through` so the terminal-and-archived state still
 * reads distinctly from terminal-but-recent (Rejected) without leaking
 * a destructive-red hue back into the chip.
 */
export const statusToneMap: Record<JobStatus, PillTone> = {
  saved:        "navy-muted",
  applied:      "amber-soft",
  screening:    "amber-soft",
  interviewing: "amber-strong",
  offer:        "amber-strong",
  rejected:     "slate",
  withdrawn:    "slate",
  closed:       "slate",
};

export const statusLabels: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

// Back-compat shim for existing consumers (StatusSelect imports this).
// Exposes the resolved className per status so the trigger can match the
// resting pill's appearance exactly.
export const statusStyles: Record<JobStatus, { label: string; className: string; tone: PillTone }> = Object.fromEntries(
  (Object.keys(statusLabels) as JobStatus[]).map((s) => [
    s,
    {
      label: statusLabels[s],
      tone: statusToneMap[s],
      // Tone classes only (no shape/density) — StatusSelect adds its own
      // trigger shape. The pill component below adds shape + density.
      className: pillClass(statusToneMap[s], "sm"),
    },
  ]),
) as Record<JobStatus, { label: string; className: string; tone: PillTone }>;

export default function StatusBadge({ status }: { status: JobStatus }) {
  const tone = statusToneMap[status];
  return (
    <span
      className={cn(
        pillClass(tone, "sm"),
        "uppercase tracking-wider",
        status === "closed" && "line-through",
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
