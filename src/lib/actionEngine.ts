import { differenceInDays, isPast, isToday, parseISO } from "date-fns";
import type {
  Job,
  Contact,
  Interview,
  ContactActivity,
  RecommendationRequest,
  TargetCompany,
  JobContact,
  NetworkRole,
} from "@/types/jobTracker";
import { getPrimaryAction } from "./outreachTemplates";

export type ActionLane = "networking" | "referrals" | "applications";
export type ActionUrgency = "overdue" | "today" | "soon" | "later";
export type ActionSource = "signal" | "nudge" | "ai";

export interface OutreachContext {
  networkRole: NetworkRole;
  contactName: string;
  targetCompany?: string;
  jobTitle?: string;
}

export interface DerivedAction {
  /** Stable signature used for snooze persistence — must be deterministic */
  signature: string;
  lane: ActionLane;
  urgency: ActionUrgency;
  source: ActionSource;
  /** Sort key — lower is more urgent */
  priorityScore: number;
  title: string;
  subtitle?: string;
  actionLabel: string;
  /** Where clicking the card takes the user */
  href?: string;
  /** Underlying entity references (used for auto-dismiss and deep links) */
  contactId?: string;
  jobId?: string;
  targetCompanyId?: string;
  recommendationRequestId?: string;
  /** ISO date for due/follow-up — informational only */
  dueDate?: string;
  /** When present, ActionCard renders inline copy-ready outreach templates */
  outreachContext?: OutreachContext;
}

const URGENCY_WEIGHT: Record<ActionUrgency, number> = {
  overdue: 0,
  today: 100,
  soon: 200,
  later: 300,
};

const LANE_WEIGHT: Record<ActionLane, number> = {
  referrals: 0, // referrals first — most leverage
  networking: 1,
  applications: 2,
};

function urgencyFromDate(iso: string | undefined): ActionUrgency {
  if (!iso) return "later";
  let d: Date;
  try {
    d = iso.length <= 10 ? parseISO(iso) : new Date(iso);
  } catch {
    return "later";
  }
  if (isNaN(d.getTime())) return "later";
  if (isPast(d) && !isToday(d)) return "overdue";
  if (isToday(d)) return "today";
  const diff = differenceInDays(d, new Date());
  if (diff <= 3) return "soon";
  return "later";
}

function scoreOf(urgency: ActionUrgency, lane: ActionLane, daysOverdue = 0): number {
  // Lower = higher priority. Overdue items get extra weight by days overdue.
  return URGENCY_WEIGHT[urgency] + LANE_WEIGHT[lane] - Math.min(daysOverdue, 30);
}

const INACTIVE_JOB_STATUSES = new Set(["rejected", "withdrawn", "closed"]);

export interface ActionEngineInput {
  jobs: Job[];
  contacts: Contact[];
  interviews: Interview[];
  contactActivities: ContactActivity[];
  recommendationRequests: RecommendationRequest[];
  targetCompanies: TargetCompany[];
  jobContacts: JobContact[];
  /** Map of action signature → ISO snoozedUntil */
  snoozes: Record<string, string>;
  /** Optional AI-derived suggestions (fully formed actions) */
  aiSuggestions?: DerivedAction[];
}

/**
 * Derives all actions from the underlying entity state.
 * Snoozed actions whose snoozedUntil is still in the future are filtered out.
 * No persistence happens here — pure function.
 */
export function deriveActions(input: ActionEngineInput): DerivedAction[] {
  const actions: DerivedAction[] = [];
  const now = new Date();

  // ============ LAYER 1: SIGNALS ============

  // Contact follow-ups
  for (const c of input.contacts) {
    if (!c.followUpDate) continue;
    const linkedJobIds = input.jobContacts
      .filter((jc) => jc.contactId === c.id)
      .map((jc) => jc.jobId);
    const linkedJobs = linkedJobIds
      .map((jid) => input.jobs.find((j) => j.id === jid))
      .filter((j): j is Job => !!j);
    if (linkedJobs.length > 0) {
      const allInactive = linkedJobs.every((j) => INACTIVE_JOB_STATUSES.has(j.status));
      if (allInactive) continue;
    }
    const urgency = urgencyFromDate(c.followUpDate);
    if (urgency === "later") continue;
    const daysOverdue = urgency === "overdue"
      ? Math.max(0, differenceInDays(now, parseISO(c.followUpDate)))
      : 0;
    const activeLinkedJob = linkedJobs.find((j) => !INACTIVE_JOB_STATUSES.has(j.status));
    const networkRole = c.networkRole as NetworkRole | undefined;
    actions.push({
      signature: `followup:contact:${c.id}:${c.followUpDate}`,
      lane: "networking",
      urgency,
      source: "signal",
      priorityScore: scoreOf(urgency, "networking", daysOverdue),
      title: `Follow up with ${c.name}`,
      subtitle: `${c.role || "Contact"} at ${c.company}`,
      actionLabel: getPrimaryAction(networkRole) || "Reach out",
      href: `/contacts?highlight=${c.id}`,
      contactId: c.id,
      dueDate: c.followUpDate,
      outreachContext: networkRole ? {
        networkRole,
        contactName: c.name,
        targetCompany: activeLinkedJob?.company || c.company,
        jobTitle: activeLinkedJob?.title,
      } : undefined,
    });
  }

  // Upcoming interviews (next 7 days, scheduled)
  for (const i of input.interviews) {
    if (i.status !== "scheduled") continue;
    const urgency = urgencyFromDate(i.date);
    if (urgency === "later") continue;
    const job = input.jobs.find((j) => j.id === i.jobId);
    if (!job) continue;
    const daysOverdue = urgency === "overdue"
      ? Math.max(0, differenceInDays(now, parseISO(i.date)))
      : 0;
    // Subtitle includes the date so users always see WHEN the interview is,
    // not just the time. The urgency chip on the row covers "overdue/today/soon",
    // but a literal date avoids ambiguity (e.g. "Fri Apr 25 · 2:00 PM").
    const ivDate = (() => {
      const d = i.date.length <= 10 ? parseISO(i.date) : new Date(i.date);
      if (isNaN(d.getTime())) return i.date;
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    })();
    actions.push({
      signature: `interview:${i.id}`,
      lane: "applications",
      urgency,
      source: "signal",
      priorityScore: scoreOf(urgency, "applications", daysOverdue) - 50, // boost interviews
      title: `${i.type[0].toUpperCase()}${i.type.slice(1)} interview — ${job.title}`,
      subtitle: `${job.company} · ${ivDate}${i.time ? ` · ${i.time}` : ""}`,
      actionLabel: "Prep & open",
      href: `/jobs/${job.id}`,
      jobId: job.id,
      dueDate: i.date,
    });
  }

  // Outstanding recommendation requests (>7 days in pending/asked status)
  for (const r of input.recommendationRequests) {
    if (r.status !== "pending") continue;
    const requested = r.requestedAt ? new Date(r.requestedAt) : null;
    if (!requested || isNaN(requested.getTime())) continue;
    const daysSinceAsked = differenceInDays(now, requested);
    if (daysSinceAsked < 7) continue;
    const contact = input.contacts.find((c) => c.id === r.contactId);
    if (!contact) continue;
    const urgency: ActionUrgency = daysSinceAsked > 14 ? "overdue" : "today";
    actions.push({
      signature: `referral:nudge:${r.id}`,
      lane: "referrals",
      urgency,
      source: "signal",
      priorityScore: scoreOf(urgency, "referrals", daysSinceAsked),
      title: `Nudge ${contact.name} on referral ask`,
      subtitle: `${daysSinceAsked} days since you asked`,
      actionLabel: "Send a nudge",
      href: `/contacts?highlight=${contact.id}`,
      contactId: contact.id,
      recommendationRequestId: r.id,
      dueDate: r.requestedAt,
    });
  }

  // ============ LAYER 2: STATUS-BASED NUDGES ============

  // Jobs in 'saved' status >14 days → apply or archive
  for (const j of input.jobs) {
    if (j.status !== "saved") continue;
    const created = new Date(j.createdAt);
    if (isNaN(created.getTime())) continue;
    const days = differenceInDays(now, created);
    if (days < 14) continue;
    const urgency: ActionUrgency = days > 30 ? "overdue" : "soon";
    actions.push({
      signature: `nudge:apply-or-archive:${j.id}`,
      lane: "applications",
      urgency,
      source: "nudge",
      priorityScore: scoreOf(urgency, "applications", Math.max(0, days - 14)),
      title: `Apply or archive: ${j.title}`,
      subtitle: `${j.company} · saved ${days}d ago`,
      actionLabel: "Decide",
      href: `/jobs/${j.id}`,
      jobId: j.id,
    });
  }

  // Dream target companies with 0 contacts → source prospects
  for (const tc of input.targetCompanies) {
    if (tc.priority !== "dream") continue;
    if (tc.status === "archived") continue;
    const hasContacts = input.contacts.some(
      (c) => c.company.trim().toLowerCase() === tc.name.trim().toLowerCase(),
    );
    if (hasContacts) continue;
    actions.push({
      signature: `nudge:source-prospects:${tc.id}`,
      lane: "networking",
      urgency: "soon",
      source: "nudge",
      priorityScore: scoreOf("soon", "networking"),
      title: `Find a Connector or Booster for ${tc.name}`,
      subtitle: `Dream company · 0 contacts`,
      actionLabel: "Source prospects",
      href: `/target-companies`,
      targetCompanyId: tc.id,
    });
  }

  // Warm contacts with no activity in 30+ days → reconnect
  for (const c of input.contacts) {
    if (c.relationshipWarmth !== "warm") continue;
    const lastActivity = input.contactActivities
      .filter((a) => a.contactId === c.id)
      .map((a) => new Date(a.activityDate).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => b - a)[0];
    const lastTouch = lastActivity ?? (c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : null);
    if (!lastTouch) continue;
    const days = differenceInDays(now, new Date(lastTouch));
    if (days < 30) continue;
    const networkRole = c.networkRole as NetworkRole | undefined;
    actions.push({
      signature: `nudge:reconnect:${c.id}`,
      lane: "networking",
      urgency: "soon",
      source: "nudge",
      priorityScore: scoreOf("soon", "networking", Math.max(0, days - 30)),
      title: `Reconnect with ${c.name}`,
      subtitle: `Warm contact · last touch ${days}d ago`,
      actionLabel: getPrimaryAction(networkRole) || "Reach out",
      href: `/contacts?highlight=${c.id}`,
      contactId: c.id,
      outreachContext: networkRole ? {
        networkRole,
        contactName: c.name,
        targetCompany: c.company,
      } : undefined,
    });
  }

  // ============ LAYER 3: AI suggestions (passed in) ============
  if (input.aiSuggestions?.length) {
    actions.push(...input.aiSuggestions);
  }

  // ============ Filter snoozed ============
  const filtered = actions.filter((a) => {
    const snoozedUntil = input.snoozes[a.signature];
    if (!snoozedUntil) return true;
    const until = new Date(snoozedUntil);
    if (isNaN(until.getTime())) return true;
    return until.getTime() <= now.getTime();
  });

  // ============ Sort ============
  filtered.sort((a, b) => a.priorityScore - b.priorityScore);

  return filtered;
}

export function groupByLane(actions: DerivedAction[]): Record<ActionLane, DerivedAction[]> {
  const out: Record<ActionLane, DerivedAction[]> = {
    networking: [],
    referrals: [],
    applications: [],
  };
  for (const a of actions) out[a.lane].push(a);
  return out;
}
