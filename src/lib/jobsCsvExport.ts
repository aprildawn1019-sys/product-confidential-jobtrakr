import type { Job, Contact, Interview, JobActivity, TargetCompany } from "@/types/jobTracker";

/**
 * Escape a value for CSV per RFC 4180.
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatList(items: string[]): string {
  return items.filter(Boolean).join(" | ");
}

export interface ExportJobsParams {
  jobs: Job[];
  interviews: Interview[];
  getContactsForJob: (jobId: string) => Contact[];
  getJobActivitiesForJob?: (jobId: string) => JobActivity[];
  getTargetForJob?: (job: Job) => TargetCompany | undefined;
}

const HEADERS = [
  "Title",
  "Company",
  "Target Priority",
  "Status",
  "Priority",
  "Type",
  "Location",
  "Salary",
  "URL",
  "Applied Date",
  "Status Updated",
  "Match Score",
  "Source",
  "Created At",
  "Notes",
  "Poster Name",
  "Poster Role",
  "Poster Email",
  "Poster Phone",
  "Linked Contacts",
  "Linked Contact Count",
  "Interviews Total",
  "Interviews Scheduled",
  "Interviews Completed",
  "Last Interview Date",
  "Last Interview Type",
  "Activity Count",
  "Last Activity Type",
  "Last Activity Date",
];

export function buildJobsCsv(params: ExportJobsParams): string {
  const { jobs, interviews, getContactsForJob, getJobActivitiesForJob, getTargetForJob } = params;

  const rows: string[] = [HEADERS.map(csvEscape).join(",")];

  for (const j of jobs) {
    const linkedContacts = getContactsForJob(j.id);
    const linkedNames = linkedContacts.map(c => (c.role ? `${c.name} (${c.role})` : c.name));

    const jobInterviews = interviews.filter(i => i.jobId === j.id);
    const sortedInterviews = [...jobInterviews].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const lastInterview = sortedInterviews[0];
    const scheduled = jobInterviews.filter(i => i.status === "scheduled").length;
    const completed = jobInterviews.filter(i => i.status === "completed").length;

    const activities = getJobActivitiesForJob?.(j.id) ?? [];
    const sortedActivities = [...activities].sort((a, b) =>
      (b.activityDate || "").localeCompare(a.activityDate || ""),
    );
    const lastActivity = sortedActivities[0];

    const target = getTargetForJob?.(j);

    const row = [
      j.title,
      j.company,
      target?.priority ?? "",
      j.status,
      j.priority ?? "",
      j.type,
      j.location,
      j.salary ?? "",
      j.url ?? "",
      j.appliedDate ?? "",
      j.statusUpdatedAt ?? "",
      j.fitScore ?? "",
      j.source ?? "",
      j.createdAt,
      j.notes ?? "",
      j.posterName ?? "",
      j.posterRole ?? "",
      j.posterEmail ?? "",
      j.posterPhone ?? "",
      formatList(linkedNames),
      linkedContacts.length,
      jobInterviews.length,
      scheduled,
      completed,
      lastInterview?.date ?? "",
      lastInterview?.type ?? "",
      activities.length,
      lastActivity?.activityType ?? "",
      lastActivity?.activityDate ?? "",
    ];

    rows.push(row.map(csvEscape).join(","));
  }

  // Prepend BOM so Excel renders UTF-8 correctly.
  return "\uFEFF" + rows.join("\r\n");
}

export function downloadJobsCsv(params: ExportJobsParams): number {
  const csv = buildJobsCsv(params);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return params.jobs.length;
}
