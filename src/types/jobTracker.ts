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
  contactId?: string;
  createdAt: string;
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
