/**
 * Outreach — a tracked effort to secure an inside referral.
 *
 * The Networking Pipeline is built on this entity. Each Outreach links
 * a Contact to a Target Company (always), and optionally to a specific
 * Job posting. Stages model the progression toward an inside referral:
 *
 *   identified → contacted → in_conversation → referral_asked
 *     → referral_made → closed (won|lost)
 *
 * See `mem://features/networking-pipeline` (forthcoming) for the JTBD
 * background. The "outcome" field is only meaningful when stage = closed.
 */

export type OutreachStage =
  | "identified"
  | "contacted"
  | "in_conversation"
  | "referral_asked"
  | "referral_made"
  | "closed";

export type OutreachOutcome = "won" | "lost";

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
  { value: "identified",      label: "Identified",      description: "A contact you should connect with at this company." },
  { value: "contacted",       label: "Contacted",       description: "You've reached out — waiting on a reply." },
  { value: "in_conversation", label: "In conversation", description: "Real exchanges underway — they know who you are." },
  { value: "referral_asked",  label: "Referral asked",  description: "You've explicitly asked for an inside referral." },
  { value: "referral_made",   label: "Referral made",   description: "They've put you forward to the hiring decision-maker." },
  { value: "closed",          label: "Closed",          description: "Won (led to interview/offer) or lost (cooled / declined)." },
];

export const OUTREACH_STAGE_LABEL: Record<OutreachStage, string> = OUTREACH_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {} as Record<OutreachStage, string>,
);
