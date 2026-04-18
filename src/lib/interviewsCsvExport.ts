import type { Interview, Job, Contact } from "@/types/jobTracker";

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

export interface ExportInterviewsParams {
  interviews: Interview[];
  jobs: Job[];
  getContactsForJob?: (jobId: string) => Contact[];
}

const HEADERS = [
  "Date",
  "Time",
  "Type",
  "Status",
  "Job Title",
  "Company",
  "Location",
  "Job Status",
  "Linked Contacts",
  "Notes",
];

export function buildInterviewsCsv(params: ExportInterviewsParams): string {
  const { interviews, jobs, getContactsForJob } = params;
  const jobsById = new Map(jobs.map(j => [j.id, j]));

  const sorted = [...interviews].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "") || (b.time || "").localeCompare(a.time || ""),
  );

  const rows: string[] = [HEADERS.map(csvEscape).join(",")];

  for (const i of sorted) {
    const job = jobsById.get(i.jobId);
    const contacts = getContactsForJob?.(i.jobId) ?? [];
    const contactNames = contacts.map(c => (c.role ? `${c.name} (${c.role})` : c.name));

    const row = [
      i.date,
      i.time ?? "",
      i.type,
      i.status,
      job?.title ?? "",
      job?.company ?? "",
      job?.location ?? "",
      job?.status ?? "",
      formatList(contactNames),
      i.notes ?? "",
    ];

    rows.push(row.map(csvEscape).join(","));
  }

  return "\uFEFF" + rows.join("\r\n");
}

export function downloadInterviewsCsv(params: ExportInterviewsParams): number {
  const csv = buildInterviewsCsv(params);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `interviews-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return params.interviews.length;
}
