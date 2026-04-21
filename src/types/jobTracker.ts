export type JobStatus = "saved" | "applied" | "screening" | "interviewing" | "offer" | "rejected" | "withdrawn" | "closed";

export interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary?: string;
  url?: string;
  status: JobStatus;
  appliedDate?: string;
  notes?: string;
  description?: string;
  contactId?: string;
  createdAt: string;
  statusUpdatedAt?: string;
  posterName?: string;
  posterEmail?: string;
  posterPhone?: string;
  posterRole?: string;
  fitScore?: number;
  priority?: string;
  source?: string;
}

export interface SkillsSnapshot {
  id: string;
  jobId?: string;
  skills: string[];
  capturedAt: string;
}

export type NetworkRole =
  | "booster"
  | "connector"
  | "recruiter_internal"
  | "recruiter_external"
  | "hiring_manager"
  | "mentor_peer";

export const NETWORK_ROLES: { value: NetworkRole; label: string; emoji: string; description: string }[] = [
  { value: "booster", label: "Booster", emoji: "🚀", description: "Inside the target company; will refer or intro you" },
  { value: "connector", label: "Connector", emoji: "🌉", description: "Outside the target co but knows people inside" },
  { value: "recruiter_internal", label: "Recruiter (internal)", emoji: "🎯", description: "In-house recruiter at one company" },
  { value: "recruiter_external", label: "Recruiter (external)", emoji: "🎲", description: "Agency or independent recruiter, cross-company" },
  { value: "hiring_manager", label: "Hiring Manager", emoji: "👔", description: "Direct decision-maker for a role" },
  { value: "mentor_peer", label: "Mentor / Peer", emoji: "🧭", description: "Advice and support, not transactional" },
];

export type RelationshipLabel = "introduced_by" | "referred_to" | "works_with" | "reports_to" | "former_colleague";

export const RELATIONSHIP_LABELS: { value: RelationshipLabel; label: string }[] = [
  { value: "introduced_by", label: "Introduced by" },
  { value: "referred_to", label: "Referred to" },
  { value: "works_with", label: "Works with" },
  { value: "reports_to", label: "Reports to" },
  { value: "former_colleague", label: "Former colleague" },
];

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  relationshipWarmth?: string;
  followUpDate?: string;
  conversationLog?: string;
  networkRole?: NetworkRole;
  /**
   * Optional profile photo URL. Auto-populated when a contact is created
   * from a LinkedIn URL (the scrape edge function returns the og:image /
   * JSON-LD `image` field), or set manually in the Add Contact dialog.
   * The UI falls back to initials when this is empty or the image fails
   * to load (LinkedIn CDN URLs can expire).
   */
  avatarUrl?: string;
}

export interface Interview {
  id: string;
  jobId: string;
  type: "phone" | "technical" | "behavioral" | "onsite" | "final";
  date: string;
  time?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface JobContact {
  id: string;
  jobId: string;
  contactId: string;
  createdAt: string;
}

export interface ContactConnection {
  id: string;
  contactId1: string;
  contactId2: string;
  connectionType: string;
  notes?: string;
  createdAt: string;
  relationshipLabel?: RelationshipLabel;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  activityType: string;
  activityDate: string;
  notes?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCampaign {
  id: string;
  contactId: string;
  campaignId: string;
  createdAt: string;
}

export interface RecommendationRequest {
  id: string;
  contactId: string;
  requestedAt: string;
  receivedAt?: string;
  notes?: string;
  status: "pending" | "received" | "declined";
  createdAt: string;
}

export interface JobActivity {
  id: string;
  jobId: string;
  activityType: string;
  activityDate: string;
  contactId?: string;
  notes?: string;
  createdAt: string;
}

export type TargetCompanyPriority = "dream" | "strong" | "interested";
export type TargetCompanyStatus = "researching" | "applied" | "connected" | "archived";

export interface TargetCompany {
  id: string;
  name: string;
  website?: string;
  careersUrl?: string;
  industry?: string;
  size?: string;
  priority: TargetCompanyPriority;
  status: TargetCompanyStatus;
  notes?: string;
  logoUrl?: string;
  createdAt: string;
}
