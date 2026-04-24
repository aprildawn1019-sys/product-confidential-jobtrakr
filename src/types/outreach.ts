/**
 * Outreach — a tracked effort to secure an inside referral.
 *
 * The Networking Pipeline is built on this entity. Each Outreach links
 * a Contact to a Target Company (always), and optionally to a specific
 * Job posting. The funnel uses 4 stages — collapsed from the original 6
 * after user research showed `contacted` and `in_conversation` blurred
 * in practice, and `referral_made` was better captured as a *reason*
 * for closure than as its own stage:
 *
 *   identified → engaged → referral_asked → closed
 *
 * When stage = "closed", the `outcome` field captures *why* it closed,
 * which drives win-rate analytics and the visual treatment of the card.
 */

export type OutreachStage =
  | "identified"
  | "engaged"
  | "referral_asked"
  | "closed";

/**
 * Reasons an outreach reaches the Closed lane. Stored in the existing
 * `outcome` column; the only "win" outcome is `referral_made`.
 */
export type OutreachOutcome =
  | "referral_made"
  | "no_referral"
  | "job_closed"
  | "other";

export interface Outreach {
  id: string;
  contactId: string;
  targetCompanyId: string;
  jobId?: string;
  stage: OutreachStage;
  outcome?: OutreachOutcome;
  goal?: string;
  notes?: string;
  referralAskedAt?: string;
  referralMadeAt?: string;
  nextStepDate?: string;
  nextStepLabel?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const OUTREACH_STAGES: { value: OutreachStage; label: string; description: string }[] = [
  { value: "identified",     label: "Identified",     description: "On your radar at this company — no outreach yet." },
  { value: "engaged",        label: "Engaged",        description: "Outreach sent — message exchange may or may not be flowing." },
  { value: "referral_asked", label: "Referral asked", description: "You've explicitly asked for an inside referral." },
  { value: "closed",         label: "Closed",         description: "The outreach is wrapped — capture the reason below." },
];

export const OUTREACH_STAGE_LABEL: Record<OutreachStage, string> = OUTREACH_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {} as Record<OutreachStage, string>,
);

/**
 * Close-reason taxonomy. `referral_made` is the win; the rest are flavors
 * of "didn't pan out." Free-text rationale lives in the `notes` field.
 */
export const OUTREACH_OUTCOMES: { value: OutreachOutcome; label: string; description: string }[] = [
  { value: "referral_made", label: "Referral made", description: "They put you forward — this is the win." },
  { value: "no_referral",   label: "No referral",   description: "They declined or went silent on the ask." },
  { value: "job_closed",    label: "Job closed",    description: "The role was filled or pulled before a referral landed." },
  { value: "other",         label: "Other",         description: "Use notes to capture the specifics." },
];

export const OUTREACH_OUTCOME_LABEL: Record<OutreachOutcome, string> = OUTREACH_OUTCOMES.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<OutreachOutcome, string>,
);
