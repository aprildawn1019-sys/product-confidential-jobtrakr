import type {
  Contact,
  ContactConnection,
  ContactActivity,
  Campaign,
  Job,
  RecommendationRequest,
} from "@/types/jobTracker";

/**
 * Escape a value for CSV per RFC 4180:
 * wrap in quotes if it contains comma / quote / newline; double up internal quotes.
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

export interface ExportContactsParams {
  contacts: Contact[];
  campaigns: Campaign[];
  jobs: Job[];
  getConnectionsForContact: (id: string) => (ContactConnection & { contact?: Contact })[];
  getActivitiesForContact: (id: string) => ContactActivity[];
  getCampaignsForContact: (id: string) => Campaign[];
  getJobsForContact: (id: string) => Job[];
  getRecommendationRequestsForContact: (id: string) => RecommendationRequest[];
}

const HEADERS = [
  "Name",
  "Company",
  "Role",
  "Email",
  "Phone",
  "LinkedIn",
  "Network Role",
  "Relationship Warmth",
  "Last Contacted",
  "Follow Up Date",
  "Notes",
  "Conversation Log",
  "Created At",
  "Campaigns",
  "Connections",
  "Linked Jobs",
  "Activity Count",
  "Last Activity Type",
  "Last Activity Date",
  "Recommendation Requests",
  "Pending Recommendations",
];

export function buildContactsCsv(params: ExportContactsParams): string {
  const {
    contacts,
    getConnectionsForContact,
    getActivitiesForContact,
    getCampaignsForContact,
    getJobsForContact,
    getRecommendationRequestsForContact,
  } = params;

  const rows: string[] = [HEADERS.map(csvEscape).join(",")];

  for (const c of contacts) {
    const campaigns = getCampaignsForContact(c.id).map(cp => cp.name);
    const connections = getConnectionsForContact(c.id).map(conn => {
      const otherName = conn.contact?.name ?? "Unknown";
      const label = conn.relationshipLabel?.replace(/_/g, " ") ?? conn.connectionType;
      return `${otherName} (${label})`;
    });
    const linkedJobs = getJobsForContact(c.id).map(j => `${j.title} @ ${j.company}`);
    const activities = getActivitiesForContact(c.id);
    const sortedActivities = [...activities].sort((a, b) =>
      (b.activityDate || "").localeCompare(a.activityDate || ""),
    );
    const lastActivity = sortedActivities[0];
    const recReqs = getRecommendationRequestsForContact(c.id);
    const pendingRecs = recReqs.filter(r => r.status === "pending").length;

    const row = [
      c.name,
      c.company,
      c.role,
      c.email ?? "",
      c.phone ?? "",
      c.linkedin ?? "",
      c.networkRole ?? "",
      c.relationshipWarmth ?? "",
      c.lastContactedAt ?? "",
      c.followUpDate ?? "",
      c.notes ?? "",
      c.conversationLog ?? "",
      c.createdAt,
      formatList(campaigns),
      formatList(connections),
      formatList(linkedJobs),
      activities.length,
      lastActivity?.activityType ?? "",
      lastActivity?.activityDate ?? "",
      recReqs.length,
      pendingRecs,
    ];

    rows.push(row.map(csvEscape).join(","));
  }

  // Prepend BOM so Excel renders UTF-8 (emoji, accents) correctly.
  return "\uFEFF" + rows.join("\r\n");
}

export function downloadContactsCsv(params: ExportContactsParams): number {
  const csv = buildContactsCsv(params);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return params.contacts.length;
}
