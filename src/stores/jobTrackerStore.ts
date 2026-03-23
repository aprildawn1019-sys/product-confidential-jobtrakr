import { useState } from "react";
import type { Job, Contact, Interview, JobStatus } from "@/types/jobTracker";

const DEMO_CONTACTS: Contact[] = [
  { id: "c1", name: "Sarah Chen", company: "Stripe", role: "Engineering Manager", email: "sarah@stripe.com", linkedin: "linkedin.com/in/sarachen", lastContactedAt: "2026-03-20", createdAt: "2026-03-01" },
  { id: "c2", name: "Alex Rivera", company: "Vercel", role: "Senior Recruiter", email: "alex@vercel.com", lastContactedAt: "2026-03-18", createdAt: "2026-03-05" },
  { id: "c3", name: "James Park", company: "Linear", role: "CTO", linkedin: "linkedin.com/in/jamespark", lastContactedAt: "2026-03-10", createdAt: "2026-02-15" },
  { id: "c4", name: "Maria Santos", company: "Figma", role: "Design Lead", email: "maria@figma.com", createdAt: "2026-03-12" },
];

const DEMO_JOBS: Job[] = [
  { id: "j1", company: "Stripe", title: "Senior Frontend Engineer", location: "San Francisco, CA", type: "hybrid", salary: "$180k-$220k", status: "interviewing", appliedDate: "2026-03-10", contactId: "c1", createdAt: "2026-03-08" },
  { id: "j2", company: "Vercel", title: "Staff Engineer", location: "Remote", type: "remote", salary: "$200k-$260k", status: "applied", appliedDate: "2026-03-15", contactId: "c2", createdAt: "2026-03-14" },
  { id: "j3", company: "Linear", title: "Full Stack Developer", location: "Remote", type: "remote", salary: "$160k-$200k", status: "screening", appliedDate: "2026-03-18", contactId: "c3", createdAt: "2026-03-16" },
  { id: "j4", company: "Figma", title: "Product Engineer", location: "New York, NY", type: "hybrid", salary: "$170k-$210k", status: "saved", createdAt: "2026-03-20" },
  { id: "j5", company: "Notion", title: "Frontend Engineer", location: "San Francisco, CA", type: "onsite", salary: "$165k-$195k", status: "offer", appliedDate: "2026-02-20", createdAt: "2026-02-18" },
  { id: "j6", company: "Datadog", title: "Software Engineer", location: "Boston, MA", type: "hybrid", status: "rejected", appliedDate: "2026-03-01", createdAt: "2026-02-28" },
];

const DEMO_INTERVIEWS: Interview[] = [
  { id: "i1", jobId: "j1", type: "technical", date: "2026-03-25", time: "2:00 PM", status: "scheduled", notes: "System design round" },
  { id: "i2", jobId: "j1", type: "phone", date: "2026-03-15", time: "10:00 AM", status: "completed", notes: "Initial screen with Sarah" },
  { id: "i3", jobId: "j5", type: "final", date: "2026-03-12", time: "11:00 AM", status: "completed", notes: "VP of Engineering" },
];

export function useJobTrackerStore() {
  const [jobs, setJobs] = useState<Job[]>(DEMO_JOBS);
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);
  const [interviews, setInterviews] = useState<Interview[]>(DEMO_INTERVIEWS);

  const addJob = (job: Omit<Job, "id" | "createdAt">) => {
    setJobs(prev => [...prev, { ...job, id: `j${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] }]);
  };

  const updateJobStatus = (id: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const addContact = (contact: Omit<Contact, "id" | "createdAt">) => {
    setContacts(prev => [...prev, { ...contact, id: `c${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] }]);
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addInterview = (interview: Omit<Interview, "id">) => {
    setInterviews(prev => [...prev, { ...interview, id: `i${Date.now()}` }]);
  };

  const getJobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);
  const getContactForJob = (contactId?: string) => contacts.find(c => c.id === contactId);
  const getInterviewsForJob = (jobId: string) => interviews.filter(i => i.jobId === jobId);

  return {
    jobs, contacts, interviews,
    addJob, updateJobStatus, deleteJob,
    addContact, deleteContact,
    addInterview,
    getJobsByStatus, getContactForJob, getInterviewsForJob,
  };
}
