/**
 * Single source of truth for "what counts as in-flight" across the app.
 *
 * Every dashboard stat card, page subtitle, and panel-header count must read
 * from these helpers so the dashboard stays numerically consistent with the
 * page it deep-links into.
 *
 * Rules — keep these short and aligned with the Command Center helper text:
 *
 *  • Active job applications  = status ∈ ACTIVE_JOB_STATUSES
 *                              (applied, screening, interviewing, offer)
 *                              Excludes: saved, rejected, withdrawn, closed.
 *
 *  • Scheduled interviews     = status === "scheduled"
 *                              Excludes: completed, cancelled.
 *
 *  • Active target companies  = status !== "archived"
 *                              (researching, applied, connected)
 *
 * If you find yourself filtering jobs/interviews/targets by status anywhere
 * else, swap it for the helper here. Adding a new status (e.g. "negotiating")
 * should be a one-line change in this file.
 */

import type { Job, Interview, TargetCompany, JobStatus } from "@/types/jobTracker";

// --- Authoritative sets ----------------------------------------------------

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  "applied",
  "screening",
  "interviewing",
  "offer",
] as const;

export const INACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  "saved",
  "rejected",
  "withdrawn",
  "closed",
] as const;

// --- Predicates (use these in .filter() / .some()) -------------------------

export const isActiveJob = (j: Pick<Job, "status">): boolean =>
  (ACTIVE_JOB_STATUSES as readonly string[]).includes(j.status);

export const isScheduledInterview = (i: Pick<Interview, "status">): boolean =>
  i.status === "scheduled";

export const isActiveTargetCompany = (tc: Pick<TargetCompany, "status">): boolean =>
  tc.status !== "archived";

// --- Counts (use these for stat cards / subtitles) -------------------------

export const countActiveJobs = (jobs: Pick<Job, "status">[]): number =>
  jobs.filter(isActiveJob).length;

export const countScheduledInterviews = (interviews: Pick<Interview, "status">[]): number =>
  interviews.filter(isScheduledInterview).length;

export const countActiveTargetCompanies = (targets: Pick<TargetCompany, "status">[]): number =>
  targets.filter(isActiveTargetCompany).length;

// --- Utility for additional in-pipeline breakdowns -------------------------

export const countJobsInStatus = (jobs: Pick<Job, "status">[], status: JobStatus): number =>
  jobs.filter(j => j.status === status).length;
