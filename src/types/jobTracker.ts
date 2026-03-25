export type JobStatus = "saved" | "applied" | "screening" | "interviewing" | "offer" | "rejected" | "withdrawn";

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
  urgency?: string;
}

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
