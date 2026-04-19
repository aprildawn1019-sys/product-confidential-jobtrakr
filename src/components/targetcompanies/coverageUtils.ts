import type { Contact, TargetCompany } from "@/types/jobTracker";
import { companiesMatch } from "@/stores/jobTrackerStore";

export type CoverageState = "booster" | "connector" | "recruiter" | "cold";

export interface CoverageInfo {
  state: CoverageState;
  boosters: Contact[];
  connectors: Contact[];
  recruiters: Contact[];
  allAtCompany: Contact[];
  /** First contact ever added at this company (by createdAt) */
  firstContact?: Contact;
}

/** Determine the coverage state for a target company based on its contacts. */
export function getCoverageInfo(company: TargetCompany, contacts: Contact[]): CoverageInfo {
  const allAtCompany = contacts.filter(c => companiesMatch(c.company, company.name));
  const boosters = allAtCompany.filter(c => c.networkRole === "booster");
  const connectors = allAtCompany.filter(c => c.networkRole === "connector");
  const recruiters = allAtCompany.filter(c => c.networkRole === "recruiter_internal");

  let state: CoverageState = "cold";
  if (boosters.length > 0) state = "booster";
  else if (connectors.length > 0) state = "connector";
  else if (recruiters.length > 0) state = "recruiter";

  const firstContact = [...allAtCompany].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  return { state, boosters, connectors, recruiters, allAtCompany, firstContact };
}

/** Find contacts NOT at the target company whose notes/conversation log mention it (forgotten 2nd-degree). */
export function findSecondDegreeMatches(company: TargetCompany, contacts: Contact[]): Contact[] {
  const needle = company.name.trim().toLowerCase();
  if (needle.length < 2) return [];
  return contacts.filter(c => {
    if (companiesMatch(c.company, company.name)) return false; // already 1st degree
    const haystack = `${c.notes || ""} ${c.conversationLog || ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

/** LinkedIn people-search deep link for a company + optional role keyword. */
export function buildLinkedInSearchUrl(company: string, roleKeyword?: string): string {
  const keywords = [company, roleKeyword].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

/** Sort comparator that ranks Dream/Strong + cold companies first (the "morning sourcing view"). */
export function coverageGapComparator(
  a: { company: TargetCompany; coverage: CoverageInfo },
  b: { company: TargetCompany; coverage: CoverageInfo },
): number {
  const priorityWeight: Record<string, number> = { dream: 3, strong: 2, interested: 1 };
  const stateWeight: Record<CoverageState, number> = { cold: 4, recruiter: 3, connector: 2, booster: 1 };
  // Archived sinks to bottom
  const aArchived = a.company.status === "archived" ? 1 : 0;
  const bArchived = b.company.status === "archived" ? 1 : 0;
  if (aArchived !== bArchived) return aArchived - bArchived;
  const aScore = (priorityWeight[a.company.priority] || 0) * 10 + stateWeight[a.coverage.state];
  const bScore = (priorityWeight[b.company.priority] || 0) * 10 + stateWeight[b.coverage.state];
  return bScore - aScore;
}

export const COVERAGE_LABELS: Record<CoverageState, { emoji: string; label: string; short: string }> = {
  booster: { emoji: "🚀", label: "Has Booster", short: "Booster" },
  connector: { emoji: "🌉", label: "Connector available", short: "Connector" },
  recruiter: { emoji: "👀", label: "Recruiter only", short: "Recruiter" },
  cold: { emoji: "❄️", label: "No inside path", short: "Cold" },
};
